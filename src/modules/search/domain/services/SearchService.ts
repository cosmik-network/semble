import { Result, ok, err } from '../../../../shared/core/Result';
import { URL } from '../../../cards/domain/value-objects/URL';
import { IMetadataService } from '../../../cards/domain/services/IMetadataService';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';
import { IVectorDatabase, SemanticSearchUrlsParams } from '../IVectorDatabase';
import { UrlView } from '@semble/types';
import {
  UrlMetadata,
  UrlMetadataProps,
} from 'src/modules/cards/domain/value-objects/UrlMetadata';
import { Chunk } from '../value-objects/Chunk';
import { UrlType } from 'src/modules/cards/domain/value-objects/UrlType';

// Candidate pool for user-filtered searches: the index is network-wide, so
// over-fetch in one query and filter down to the user's URLs in memory
const USER_FILTER_CANDIDATE_POOL = 200;

export class SearchService {
  constructor(
    private vectorDatabase: IVectorDatabase,
    private metadataService: IMetadataService,
    private cardQueryRepository: ICardQueryRepository,
  ) {}

  async indexUrl(url: URL): Promise<Result<void>> {
    try {
      // 1. Get metadata for the URL
      const metadataResult = await this.metadataService.fetchMetadata(url);
      if (metadataResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch metadata: ${metadataResult.error.message}`,
          ),
        );
      }

      const metadata = metadataResult.value;

      // 2. Check if content meets minimum length for indexing
      const chunk = Chunk.create(metadata);
      if (!chunk.meetsMinLength()) {
        // Skip indexing silently - content too short
        return ok(undefined);
      }

      // 3. Index in vector database
      const indexResult = await this.vectorDatabase.indexUrl({
        url: url.value,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        publishedDate: metadata.publishedDate,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        type: metadata.type,
      });

      if (indexResult.isErr()) {
        return err(
          new Error(`Failed to index URL: ${indexResult.error.message}`),
        );
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async findSimilarUrls(
    url: URL,
    options: {
      limit: number;
      threshold?: number;
      urlType?: UrlType;
      callingUserId?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<UrlView[]>> {
    try {
      // 1. Get metadata for the URL to extract title + description
      const metadataResult = await this.metadataService.fetchMetadata(url);
      if (metadataResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch metadata for similarity search: ${metadataResult.error.message}`,
          ),
        );
      }

      // 2. Create chunk from metadata to get searchable content
      const chunk = Chunk.create(metadataResult.value);
      const searchQuery = chunk.value || url.value; // Fallback to URL if no content

      // 3. Find similar URLs using the content as query
      const searchParams: SemanticSearchUrlsParams = {
        query: searchQuery,
        limit: options.limit * 2, // Get more results to account for filtering
        threshold: options.threshold,
        urlType: options.urlType,
      };

      return await this.processSemanticSearchResults(searchParams, {
        ...options,
        excludeUrl: url.value,
      });
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Finds URLs similar to the given URL and partitions them into everything
   * that matched and the subset already saved by the given user.
   *
   * Callers that need both views (e.g. recommending both the user's own
   * collections and open collections) should use this rather than calling
   * findSimilarUrls twice: it casts a single wide net against the vector
   * index and derives both sets from it, so the metadata fetch, the vector
   * query and the library-context enrichment each happen once.
   *
   * `savedByUser` is a subset of `all`, both ordered by similarity.
   */
  async findSimilarUrlsPartitionedByUser(
    url: URL,
    options: {
      limit: number;
      userId: string;
      threshold?: number;
      urlType?: UrlType;
      callingUserId?: string;
    },
  ): Promise<Result<{ all: UrlView[]; savedByUser: UrlView[] }>> {
    try {
      // 1. Metadata -> chunk -> search query (fetched once for both views)
      const metadataResult = await this.metadataService.fetchMetadata(url);
      if (metadataResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch metadata for similarity search: ${metadataResult.error.message}`,
          ),
        );
      }
      const chunk = Chunk.create(metadataResult.value);
      const searchQuery = chunk.value || url.value;

      // 2. One wide query against the index. Repeat queries return the same
      // top candidates, so a single pool serves both partitions.
      const searchResult = await this.vectorDatabase.semanticSearchUrls({
        query: searchQuery,
        limit: USER_FILTER_CANDIDATE_POOL,
        topK: USER_FILTER_CANDIDATE_POOL,
        threshold: options.threshold,
        urlType: options.urlType,
      });
      if (searchResult.isErr()) {
        return err(
          new Error(`Vector search failed: ${searchResult.error.message}`),
        );
      }

      const candidates = searchResult.value.filter((result) =>
        this.isUsableCandidate(result, url.value),
      );

      // 3. Partition. Best-effort: either side may return fewer than limit.
      const userUrlSet = await this.cardQueryRepository.getUrlsSavedByUser(
        options.userId,
        candidates.map((result) => result.url),
      );

      const all = candidates.slice(0, options.limit);
      const savedByUser = candidates
        .filter((result) => userUrlSet.has(result.url))
        .slice(0, options.limit);

      // 4. Enrich both partitions in one batch over their union
      const unionByUrl = new Map(
        [...all, ...savedByUser].map((result) => [result.url, result]),
      );
      const enriched = await this.enrichUrlsWithContext(
        Array.from(unionByUrl.values()),
        options.callingUserId,
      );
      const enrichedByUrl = new Map(enriched.map((view) => [view.url, view]));
      const toViews = (results: typeof candidates) =>
        results
          .map((result) => enrichedByUrl.get(result.url))
          .filter((view): view is UrlView => view !== undefined);

      return ok({ all: toViews(all), savedByUser: toViews(savedByUser) });
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async semanticSearchUrls(
    query: string,
    options: {
      limit: number;
      threshold?: number;
      urlType?: UrlType;
      callingUserId?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<UrlView[]>> {
    try {
      const searchParams: SemanticSearchUrlsParams = {
        query,
        limit: options.limit * 2, // Get more results to account for filtering
        threshold: options.threshold,
        urlType: options.urlType,
      };

      return await this.processSemanticSearchResults(searchParams, {
        ...options,
        filterByUserId: options.filterByUserId,
      });
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async healthCheck(): Promise<Result<boolean>> {
    return await this.vectorDatabase.healthCheck();
  }

  private async processSemanticSearchResults(
    searchParams: SemanticSearchUrlsParams,
    options: {
      limit: number;
      callingUserId?: string;
      excludeUrl?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<UrlView[]>> {
    if (options.filterByUserId) {
      return await this.processSemanticSearchWithUserFilter(
        searchParams,
        options,
      );
    }

    // Standard processing without user filtering
    const searchResult =
      await this.vectorDatabase.semanticSearchUrls(searchParams);
    if (searchResult.isErr()) {
      return err(
        new Error(`Vector search failed: ${searchResult.error.message}`),
      );
    }

    // Filter out excluded URL and results with insufficient content
    const filteredResults = searchResult.value.filter((result) =>
      this.isUsableCandidate(result, options.excludeUrl),
    );

    // Limit to requested amount after filtering
    const limitedResults = filteredResults.slice(0, options.limit);

    // Enrich results with library counts and context
    const enrichedUrls = await this.enrichUrlsWithContext(
      limitedResults,
      options.callingUserId,
    );

    return ok(enrichedUrls);
  }

  private async processSemanticSearchWithUserFilter(
    searchParams: SemanticSearchUrlsParams,
    options: {
      limit: number;
      callingUserId?: string;
      excludeUrl?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<UrlView[]>> {
    // Single wide query: repeat queries against the index return the same
    // top candidates, so cast one wide net and filter in memory. Best-effort —
    // may return fewer than options.limit results.
    const searchResult = await this.vectorDatabase.semanticSearchUrls({
      ...searchParams,
      limit: USER_FILTER_CANDIDATE_POOL,
      topK: USER_FILTER_CANDIDATE_POOL,
    });
    if (searchResult.isErr()) {
      return err(
        new Error(`Vector search failed: ${searchResult.error.message}`),
      );
    }

    const userUrlSet = await this.cardQueryRepository.getUrlsSavedByUser(
      options.filterByUserId!,
      searchResult.value.map((result) => result.url),
    );

    const filteredResults = searchResult.value
      .filter(
        (result) =>
          userUrlSet.has(result.url) &&
          this.isUsableCandidate(result, options.excludeUrl),
      )
      .slice(0, options.limit);

    const enrichedResults = await this.enrichUrlsWithContext(
      filteredResults,
      options.callingUserId,
    );

    return ok(enrichedResults);
  }

  /**
   * A candidate is usable if it isn't the URL we searched from and still has
   * enough indexed content to be worth showing.
   */
  private isUsableCandidate(
    result: { url: string; metadata: UrlMetadataProps },
    excludeUrl?: string,
  ): boolean {
    if (excludeUrl && result.url === excludeUrl) {
      return false;
    }
    const metadataResult = UrlMetadata.create(result.metadata);
    if (metadataResult.isErr()) {
      return false;
    }
    return Chunk.create(metadataResult.value).meetsMinLength();
  }

  private async enrichUrlsWithContext(
    searchResults: Array<{
      url: string;
      similarity: number;
      metadata: UrlMetadataProps;
    }>,
    callingUserId?: string,
  ): Promise<UrlView[]> {
    // Extract all URLs
    const urls = searchResults.map((result) => result.url);

    // Batch fetch library info for all URLs
    const urlLibraryInfoMap =
      await this.cardQueryRepository.getBatchUrlLibraryInfo(
        urls,
        callingUserId,
      );

    // Enrich each URL with library context
    const enrichedResults = searchResults.map((result) => {
      const libraryInfo = urlLibraryInfoMap.get(result.url);

      return {
        url: result.url,
        metadata: {
          url: result.url,
          title: result.metadata.title,
          description: result.metadata.description,
          author: result.metadata.author,
          siteName: result.metadata.siteName,
          imageUrl: result.metadata.imageUrl,
          type: result.metadata.type,
          retrievedAt: result.metadata.retrievedAt?.toISOString(),
          doi: result.metadata.doi,
          isbn: result.metadata.isbn,
        },
        urlLibraryCount: libraryInfo?.urlLibraryCount || 0,
        urlInLibrary: libraryInfo?.urlInLibrary,
        urlConnectionCount: libraryInfo?.urlConnectionCount,
        urlIsConnected: libraryInfo?.urlIsConnected,
      };
    });

    return enrichedResults;
  }
}
