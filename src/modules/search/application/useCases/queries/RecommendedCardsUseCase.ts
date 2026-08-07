import Redis from 'ioredis';
import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { UrlView, Pagination } from '@semble/types';
import {
  IVectorDatabase,
  UrlSearchResult,
} from '../../../domain/IVectorDatabase';
import {
  CardSortField,
  ICardQueryRepository,
  SortOrder,
  UrlRankingStats,
} from '../../../../cards/domain/ICardQueryRepository';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';

export interface RecommendationRankingConfig {
  urlCardWeight: number;
  noteWeight: number;
  collectionWeight: number;
  connectionWeight: number;
  // 0 = fully deterministic ranking, 1 = maximum jitter (still skewed toward higher scores)
  randomness: number;
}

export const DEFAULT_RANKING_CONFIG: RecommendationRankingConfig = {
  urlCardWeight: 2,
  noteWeight: 1,
  collectionWeight: 3,
  connectionWeight: 4,
  randomness: 0.5,
};

const VECTOR_SEARCH_LIMIT = 100;
const MAX_RESULTS = 100;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// When no queries are provided, derive them from the caller's library:
// pick SEED_CARD_COUNT random URL cards out of their RECENT_CARD_POOL_SIZE
// most recent ones and use each card's title + description as a query.
const RECENT_CARD_POOL_SIZE = 20;
const SEED_CARD_COUNT = 3;

const CACHE_KEY_PREFIX = 'recommended-cards:';
const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface RecommendedCardsQuery {
  queries?: string[];
  callingUserId?: string;
  page?: number;
  limit?: number;
}

export interface RecommendedCardsResult {
  urls: UrlView[];
  // The queries actually used, whether passed in or derived. Clients pass
  // these back when paginating so every page reads the same cached ranked set.
  queries: string[];
  pagination: Pagination;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class RecommendedCardsUseCase implements UseCase<
  RecommendedCardsQuery,
  Result<RecommendedCardsResult, ValidationError | AppError.UnexpectedError>
> {
  private config: RecommendationRankingConfig;

  constructor(
    private vectorDatabase: IVectorDatabase,
    private cardQueryRepository: ICardQueryRepository,
    private profileService: IProfileService,
    // Optional Redis cache for the ranked set. When absent (e.g. mock mode),
    // the ranking is recomputed on every request.
    private redis?: Redis,
    config?: Partial<RecommendationRankingConfig>,
  ) {
    this.config = { ...DEFAULT_RANKING_CONFIG, ...config };
  }

  async execute(
    query: RecommendedCardsQuery,
  ): Promise<
    Result<RecommendedCardsResult, ValidationError | AppError.UnexpectedError>
  > {
    try {
      let queries = (query.queries || [])
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (queries.length === 0) {
        queries = await this.deriveQueries(query.callingUserId);
      }

      const page = Math.max(query.page || 1, 1);
      const limit = Math.min(
        Math.max(query.limit || DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      );

      if (queries.length === 0) {
        // Nothing to recommend from: no queries given, and no library cards
        // or profile bio to derive them from.
        return ok({
          urls: [],
          queries: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasMore: false,
            limit,
          },
        });
      }

      // Build (or read from cache) the full ranked list, then paginate over it.
      // The ranked order is stable per (queries, user) so pages don't reshuffle.
      const rankedResult = await this.getRankedUrls(
        queries,
        query.callingUserId,
      );
      if (rankedResult.isErr()) {
        return err(rankedResult.error);
      }
      const allUrls = rankedResult.value;

      const totalCount = allUrls.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUrls = allUrls.slice(startIndex, endIndex);

      return ok({
        urls: paginatedUrls,
        queries,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: endIndex < totalCount,
          limit,
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  /**
   * Derives query strings for a caller who didn't provide any: title +
   * description of random recent library cards, falling back to the profile
   * bio. Returns an empty array when nothing usable exists.
   */
  private async deriveQueries(callingUserId?: string): Promise<string[]> {
    if (!callingUserId) {
      return [];
    }

    const recentCards = await this.cardQueryRepository.getUrlCardsOfUser(
      callingUserId,
      {
        page: 1,
        limit: RECENT_CARD_POOL_SIZE,
        sortBy: CardSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
      },
    );

    // Cards with neither title nor description can't produce a useful query
    const usableCards = recentCards.items.filter(
      (card) =>
        card.cardContent.title?.trim() || card.cardContent.description?.trim(),
    );

    const selectedCards = this.pickRandom(usableCards, SEED_CARD_COUNT);
    const queries = selectedCards.map((card) =>
      [card.cardContent.title?.trim(), card.cardContent.description?.trim()]
        .filter(Boolean)
        .join(' '),
    );
    if (queries.length > 0) {
      return queries;
    }

    // No usable cards: fall back to the profile bio
    const profileResult = await this.profileService.getProfile(
      callingUserId,
      callingUserId,
    );
    const bio = profileResult.isOk()
      ? profileResult.value.bio?.trim()
      : undefined;
    return bio ? [bio] : [];
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    if (items.length <= count) {
      return items;
    }
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled.slice(0, count);
  }

  /**
   * Returns the full ranked list of recommended URLs for the given queries and
   * caller. Reads from Redis when available; otherwise (or on a cache miss)
   * runs the expensive vector search + ranking and caches the result.
   */
  private async getRankedUrls(
    queries: string[],
    callingUserId?: string,
  ): Promise<Result<UrlView[], ValidationError | AppError.UnexpectedError>> {
    const cacheKey = this.getCacheKey(queries, callingUserId);

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return ok(JSON.parse(cached) as UrlView[]);
        }
      } catch (cacheError) {
        console.warn(
          `Redis error reading recommended cards cache for ${cacheKey}:`,
          cacheError,
        );
      }
    }

    const rankedResult = await this.computeRankedUrls(queries, callingUserId);
    if (rankedResult.isErr()) {
      return rankedResult;
    }

    if (this.redis) {
      try {
        await this.redis.setex(
          cacheKey,
          CACHE_TTL_SECONDS,
          JSON.stringify(rankedResult.value),
        );
      } catch (cacheError) {
        console.warn(
          `Redis error writing recommended cards cache for ${cacheKey}:`,
          cacheError,
        );
      }
    }

    return rankedResult;
  }

  private getCacheKey(queries: string[], callingUserId?: string): string {
    // Sort queries so ordering doesn't fragment the cache; scope to the caller
    // because the ranked set filters out URLs they've already saved.
    const normalizedQueries = [...queries].sort().join('|');
    return `${CACHE_KEY_PREFIX}${callingUserId ?? 'anon'}:${normalizedQueries}`;
  }

  /**
   * Runs the parallel vector searches, ranking, and UrlView assembly.
   */
  private async computeRankedUrls(
    queries: string[],
    callingUserId?: string,
  ): Promise<Result<UrlView[], ValidationError | AppError.UnexpectedError>> {
    try {
      // 1. Run parallel semantic searches for each query string
      const searchResults = await Promise.all(
        queries.map((q) =>
          this.vectorDatabase.semanticSearchUrls({
            query: q,
            limit: VECTOR_SEARCH_LIMIT,
          }),
        ),
      );

      const successfulResults = searchResults.filter((r) => r.isOk());
      if (successfulResults.length === 0) {
        const firstError = searchResults[0]!;
        return err(
          new ValidationError(
            `Failed to search URLs: ${firstError.isErr() ? firstError.error.message : 'Unknown error'}`,
          ),
        );
      }

      // 2. Dedupe by URL, keeping the highest-similarity result for metadata
      const uniqueResults = new Map<string, UrlSearchResult>();
      for (const result of successfulResults) {
        for (const item of result.isOk() ? result.value : []) {
          const existing = uniqueResults.get(item.url);
          if (!existing || item.similarity > existing.similarity) {
            uniqueResults.set(item.url, item);
          }
        }
      }

      const urls = Array.from(uniqueResults.keys());
      if (urls.length === 0) {
        return ok([]);
      }

      // 3. Batch fetch ranking stats and library info
      const [rankingStatsMap, urlLibraryInfoMap] = await Promise.all([
        this.cardQueryRepository.getBatchUrlRankingStats(urls),
        this.cardQueryRepository.getBatchUrlLibraryInfo(urls, callingUserId),
      ]);

      // 4. Drop URLs the calling user has already saved or connected
      const candidateUrls = urls.filter((url) => {
        if (!callingUserId) return true;
        const libraryInfo = urlLibraryInfoMap.get(url);
        return !libraryInfo?.urlInLibrary && !libraryInfo?.urlIsConnected;
      });

      // 5. Rank with weighted score plus randomness
      const rankedAll = candidateUrls
        .map((url) => ({
          url,
          rankKey: this.computeRankKey(rankingStatsMap.get(url)),
        }))
        .sort((a, b) => b.rankKey - a.rankKey);

      // Drop URLs whose metadata (title + description) duplicates one already
      // kept, so results vary rather than surfacing near-identical entries.
      // Iterating in ranked order keeps the highest-ranked of each duplicate set.
      const seenMetadata = new Set<string>();
      const ranked = rankedAll
        .filter(({ url }) => {
          const metadataKey = this.getMetadataKey(uniqueResults.get(url)!);
          if (metadataKey === null) return true;
          if (seenMetadata.has(metadataKey)) return false;
          seenMetadata.add(metadataKey);
          return true;
        })
        .slice(0, MAX_RESULTS);

      // 6. Build UrlViews from vector metadata + library info
      const urlViews: UrlView[] = ranked.map(({ url }) => {
        const searchResult = uniqueResults.get(url)!;
        const libraryInfo = urlLibraryInfoMap.get(url);

        return {
          url,
          metadata: {
            url,
            title: searchResult.metadata.title,
            description: searchResult.metadata.description,
            author: searchResult.metadata.author,
            siteName: searchResult.metadata.siteName,
            imageUrl: searchResult.metadata.imageUrl,
            type: searchResult.metadata.type,
            retrievedAt: searchResult.metadata.retrievedAt?.toISOString(),
            doi: searchResult.metadata.doi,
            isbn: searchResult.metadata.isbn,
          },
          urlLibraryCount: libraryInfo?.urlLibraryCount || 0,
          urlInLibrary: libraryInfo?.urlInLibrary,
          urlConnectionCount: libraryInfo?.urlConnectionCount,
          urlIsConnected: libraryInfo?.urlIsConnected,
        };
      });

      return ok(urlViews);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  /**
   * Builds a dedup key from a result's title + description so entries with
   * identical metadata collapse to one. Returns null when both are empty, so
   * metadata-less results aren't all treated as duplicates of each other.
   */
  private getMetadataKey(result: UrlSearchResult): string | null {
    const title = result.metadata.title?.trim().toLowerCase() ?? '';
    const description = result.metadata.description?.trim().toLowerCase() ?? '';
    if (!title && !description) return null;
    return `${title} ${description}`;
  }

  private computeRankKey(stats: UrlRankingStats | undefined): number {
    const score = stats
      ? this.config.urlCardWeight * stats.urlCardCount +
        this.config.noteWeight * stats.noteCount +
        this.config.collectionWeight * stats.collectionCount +
        this.config.connectionWeight * stats.connectionCount
      : 0;

    // Multiplicative jitter: randomness=0 keeps deterministic order,
    // randomness=1 scales each score by a uniform random factor in [0, 1].
    // The +1 base lets zero-score URLs shuffle among themselves too.
    const randomness = Math.min(Math.max(this.config.randomness, 0), 1);
    const jitter = 1 - randomness + randomness * Math.random();
    return (score + 1) * jitter;
  }
}
