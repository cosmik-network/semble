import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { CollectionDTO, User } from '@semble/types';
import {
  CollectionWithMatchedUrlsDTO,
  ICollectionQueryRepository,
} from '../../../domain/ICollectionQueryRepository';
import { CollectionAccessType } from '../../../domain/Collection';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ProfileMapper } from '../../mappers/ProfileMapper';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { SearchService } from 'src/modules/search/domain/services/SearchService';
import { URL } from '../../../domain/value-objects/URL';

// How many similar URLs seed each set of recommendations
const SIMILAR_URLS_LIMIT = 20;
const SIMILARITY_THRESHOLD = 0.3;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export interface GetRecommendedCollectionsForUrlQuery {
  url: string;
  callingUserId: string;
  limit?: number;
}

export interface GetRecommendedCollectionsForUrlResult {
  myCollections: CollectionDTO[];
  openCollections: CollectionDTO[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Recommends collections to save a URL to, in two sets:
 *
 * - `myCollections`: the caller's own collections containing URLs from their
 *   library that are semantically similar to the given URL.
 * - `openCollections`: OPEN collections from across the network containing
 *   semantically similar URLs, excluding the caller's own.
 *
 * Both sets are derived from a single vector-database query — the candidate
 * pool is fetched once and partitioned — and each is ranked by how many
 * similar URLs the collection contains, ties broken by similarity rank.
 *
 * Collections that already contain the given URL are excluded, since there is
 * nothing to save to them.
 */
export class GetRecommendedCollectionsForUrlUseCase implements UseCase<
  GetRecommendedCollectionsForUrlQuery,
  Result<
    GetRecommendedCollectionsForUrlResult,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private searchService: SearchService,
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetRecommendedCollectionsForUrlQuery,
  ): Promise<
    Result<
      GetRecommendedCollectionsForUrlResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);

      const urlResult = URL.create(query.url);
      if (urlResult.isErr()) {
        return err(
          new ValidationError(`Invalid URL: ${urlResult.error.message}`),
        );
      }

      // One vector query serves both sets: `all` seeds open collections from
      // across the network, `savedByUser` seeds the caller's own collections.
      const similarUrlsResult =
        await this.searchService.findSimilarUrlsPartitionedByUser(
          urlResult.value,
          {
            limit: SIMILAR_URLS_LIMIT,
            threshold: SIMILARITY_THRESHOLD,
            userId: query.callingUserId,
            callingUserId: query.callingUserId,
          },
        );

      // Recommendations are best-effort: a failed similarity search just
      // yields no recommendations
      if (similarUrlsResult.isErr()) {
        return ok({ myCollections: [], openCollections: [] });
      }

      const networkUrls = similarUrlsResult.value.all.map((u) => u.url);
      const myUrls = similarUrlsResult.value.savedByUser.map((u) => u.url);

      // Only recommend collections the URL can still be added to
      const targetUrl = urlResult.value.value;

      const [myCandidates, openCandidates] = await Promise.all([
        myUrls.length > 0
          ? this.collectionQueryRepo.getCollectionsForUrlsByAuthor(
              myUrls,
              query.callingUserId,
              targetUrl,
            )
          : Promise.resolve([]),
        networkUrls.length > 0
          ? this.collectionQueryRepo.getOpenCollectionsForUrls(
              networkUrls,
              query.callingUserId,
              targetUrl,
            )
          : Promise.resolve([]),
      ]);

      const myRanked = this.rank(myCandidates, myUrls, limit);
      const openRanked = this.rank(openCandidates, networkUrls, limit);

      const [myCollections, openCollections] = await Promise.all([
        this.toOwnCollectionDTOs(myRanked, query.callingUserId),
        this.toOpenCollectionDTOs(openRanked),
      ]);

      if (myCollections.isErr()) {
        return err(myCollections.error);
      }
      if (openCollections.isErr()) {
        return err(openCollections.error);
      }

      return ok({
        myCollections: myCollections.value,
        openCollections: openCollections.value,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  /**
   * More matched similar URLs first; ties broken by the best (earliest)
   * similarity rank among the matches.
   */
  private rank(
    candidates: CollectionWithMatchedUrlsDTO[],
    similarUrls: string[],
    limit: number,
  ): CollectionWithMatchedUrlsDTO[] {
    const rankByUrl = new Map(similarUrls.map((url, i) => [url, i]));
    const bestRank = (matchedUrls: string[]) =>
      Math.min(
        ...matchedUrls.map((u) => rankByUrl.get(u) ?? Number.MAX_SAFE_INTEGER),
      );

    return [...candidates]
      .sort(
        (a, b) =>
          b.matchedUrls.length - a.matchedUrls.length ||
          bestRank(a.matchedUrls) - bestRank(b.matchedUrls),
      )
      .slice(0, limit);
  }

  /**
   * All of these collections belong to the calling user, so a single profile
   * lookup covers them.
   */
  private async toOwnCollectionDTOs(
    ranked: CollectionWithMatchedUrlsDTO[],
    callingUserId: string,
  ): Promise<Result<CollectionDTO[], AppError.UnexpectedError>> {
    if (ranked.length === 0) {
      return ok([]);
    }

    const profileResult = await this.profileService.getProfile(callingUserId);
    if (profileResult.isErr()) {
      return err(AppError.UnexpectedError.create(profileResult.error));
    }
    const authorProfile = ProfileMapper.toInlineProfile(profileResult.value);

    return ok(
      ranked.map((collection) => this.toDTO(collection, authorProfile)),
    );
  }

  /**
   * Open collections come from many authors, so their profiles are enriched
   * in a batch; collections whose author can't be resolved are dropped.
   */
  private async toOpenCollectionDTOs(
    ranked: CollectionWithMatchedUrlsDTO[],
  ): Promise<Result<CollectionDTO[], AppError.UnexpectedError>> {
    if (ranked.length === 0) {
      return ok([]);
    }

    const authorIds = [...new Set(ranked.map((c) => c.authorId))];
    const profileEnricher = new ProfileEnricher(this.profileService);
    const profileMapResult = await profileEnricher.buildProfileMap(
      authorIds,
      undefined,
      { skipFailures: true, mapToUser: false },
    );
    if (profileMapResult.isErr()) {
      return err(AppError.UnexpectedError.create(profileMapResult.error));
    }
    const profileMap: Map<string, User> = profileMapResult.value;

    return ok(
      ranked
        .map((collection): CollectionDTO | null => {
          const author = profileMap.get(collection.authorId);
          return author ? this.toDTO(collection, author) : null;
        })
        .filter(
          (collection): collection is CollectionDTO => collection !== null,
        ),
    );
  }

  private toDTO(
    collection: CollectionWithMatchedUrlsDTO,
    author: CollectionDTO['author'],
  ): CollectionDTO {
    return {
      id: collection.id,
      uri: collection.uri,
      name: collection.name,
      description: collection.description,
      accessType: collection.accessType as CollectionAccessType,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      cardCount: collection.cardCount,
      author,
    };
  }
}
