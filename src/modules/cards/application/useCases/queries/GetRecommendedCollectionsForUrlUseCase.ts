import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { CollectionDTO } from '@semble/types';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { CollectionAccessType } from '../../../domain/Collection';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ProfileMapper } from '../../mappers/ProfileMapper';
import { SearchService } from 'src/modules/search/domain/services/SearchService';
import { URL } from '../../../domain/value-objects/URL';

// How many similar URLs from the caller's library seed the recommendation
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
  collections: CollectionDTO[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Recommends the calling user's own collections to save a URL to: finds URLs
 * in the caller's library semantically similar to the given URL, then returns
 * the caller's collections containing those similar URLs, ranked by how many
 * similar URLs each collection contains (ties broken by similarity rank).
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

      // Similar URLs restricted to the caller's own library
      const similarUrlsResult = await this.searchService.findSimilarUrls(
        urlResult.value,
        {
          limit: SIMILAR_URLS_LIMIT,
          threshold: SIMILARITY_THRESHOLD,
          callingUserId: query.callingUserId,
          filterByUserId: query.callingUserId,
        },
      );

      // Recommendations are best-effort: a failed similarity search just
      // yields no recommendations
      const similarUrls = similarUrlsResult.isOk()
        ? similarUrlsResult.value.map((u) => u.url)
        : [];
      if (similarUrls.length === 0) {
        return ok({ collections: [] });
      }

      const candidates =
        await this.collectionQueryRepo.getCollectionsForUrlsByAuthor(
          similarUrls,
          query.callingUserId,
        );
      if (candidates.length === 0) {
        return ok({ collections: [] });
      }

      // Rank: more matched similar URLs first; ties broken by the best
      // (earliest) similarity rank among the matches
      const rankByUrl = new Map(similarUrls.map((url, i) => [url, i]));
      const bestRank = (matchedUrls: string[]) =>
        Math.min(
          ...matchedUrls.map(
            (u) => rankByUrl.get(u) ?? Number.MAX_SAFE_INTEGER,
          ),
        );
      const ranked = candidates
        .sort(
          (a, b) =>
            b.matchedUrls.length - a.matchedUrls.length ||
            bestRank(a.matchedUrls) - bestRank(b.matchedUrls),
        )
        .slice(0, limit);

      // All recommended collections belong to the calling user
      const profileResult = await this.profileService.getProfile(
        query.callingUserId,
      );
      if (profileResult.isErr()) {
        return err(AppError.UnexpectedError.create(profileResult.error));
      }
      const authorProfile = ProfileMapper.toInlineProfile(profileResult.value);

      const collections: CollectionDTO[] = ranked.map((collection) => ({
        id: collection.id,
        uri: collection.uri,
        name: collection.name,
        description: collection.description,
        accessType: collection.accessType as CollectionAccessType,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
        cardCount: collection.cardCount,
        author: authorProfile,
      }));

      return ok({ collections });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
