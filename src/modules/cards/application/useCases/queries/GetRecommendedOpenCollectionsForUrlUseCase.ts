import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { CollectionDTO, User } from '@semble/types';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { CollectionAccessType } from '../../../domain/Collection';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { SearchService } from 'src/modules/search/domain/services/SearchService';
import { URL } from '../../../domain/value-objects/URL';

// How many similar URLs from across the network seed the recommendation
const SIMILAR_URLS_LIMIT = 20;
const SIMILARITY_THRESHOLD = 0.3;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export interface GetRecommendedOpenCollectionsForUrlQuery {
  url: string;
  callingUserId: string;
  limit?: number;
}

export interface GetRecommendedOpenCollectionsForUrlResult {
  collections: CollectionDTO[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Recommends open collections from across the network to save a URL to: finds
 * URLs semantically similar to the given URL (from any user's library), then
 * returns OPEN collections containing those similar URLs, ranked by how many
 * similar URLs each collection contains (ties broken by similarity rank).
 * The caller's own collections are excluded — those are covered by
 * GetRecommendedCollectionsForUrlUseCase.
 */
export class GetRecommendedOpenCollectionsForUrlUseCase implements UseCase<
  GetRecommendedOpenCollectionsForUrlQuery,
  Result<
    GetRecommendedOpenCollectionsForUrlResult,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private searchService: SearchService,
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetRecommendedOpenCollectionsForUrlQuery,
  ): Promise<
    Result<
      GetRecommendedOpenCollectionsForUrlResult,
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

      // Similar URLs from anywhere on the network (no per-user filter)
      const similarUrlsResult = await this.searchService.findSimilarUrls(
        urlResult.value,
        {
          limit: SIMILAR_URLS_LIMIT,
          threshold: SIMILARITY_THRESHOLD,
          callingUserId: query.callingUserId,
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
        await this.collectionQueryRepo.getOpenCollectionsForUrls(
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

      // Enrich the distinct collection authors' profiles
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

      const collections: CollectionDTO[] = ranked
        .map((collection): CollectionDTO | null => {
          const author = profileMap.get(collection.authorId);
          if (!author) return null;

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
        })
        .filter(
          (collection): collection is CollectionDTO => collection !== null,
        );

      return ok({ collections });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
