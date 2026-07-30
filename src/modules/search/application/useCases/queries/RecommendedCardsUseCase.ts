import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { UrlView } from '@semble/types';
import {
  IVectorDatabase,
  UrlSearchResult,
} from '../../../domain/IVectorDatabase';
import {
  ICardQueryRepository,
  UrlRankingStats,
} from '../../../../cards/domain/ICardQueryRepository';

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

export interface RecommendedCardsQuery {
  queries: string[];
  callingUserId?: string;
}

export interface RecommendedCardsResult {
  urls: UrlView[];
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
      const queries = (query.queries || [])
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      if (queries.length === 0) {
        return err(new ValidationError('At least one query is required'));
      }

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
        return ok({ urls: [] });
      }

      // 3. Batch fetch ranking stats and library info
      const [rankingStatsMap, urlLibraryInfoMap] = await Promise.all([
        this.cardQueryRepository.getBatchUrlRankingStats(urls),
        this.cardQueryRepository.getBatchUrlLibraryInfo(
          urls,
          query.callingUserId,
        ),
      ]);

      // 4. Drop URLs the calling user has already saved or connected
      const candidateUrls = urls.filter((url) => {
        if (!query.callingUserId) return true;
        const libraryInfo = urlLibraryInfoMap.get(url);
        return !libraryInfo?.urlInLibrary && !libraryInfo?.urlIsConnected;
      });

      // 5. Rank with weighted score plus randomness
      const ranked = candidateUrls
        .map((url) => ({
          url,
          rankKey: this.computeRankKey(rankingStatsMap.get(url)),
        }))
        .sort((a, b) => b.rankKey - a.rankKey)
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

      return ok({ urls: urlViews });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
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
