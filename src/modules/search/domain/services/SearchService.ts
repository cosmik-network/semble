import { Result, ok, err } from '../../../../shared/core/Result';
import { URL } from '../../../cards/domain/value-objects/URL';
import { IMetadataService } from '../../../cards/domain/services/IMetadataService';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';
import { IVectorDatabase, SemanticSearchUrlsParams } from '../IVectorDatabase';
import { UrlView } from '@semble/types/api/responses';
import { CardSortField, SortOrder } from '@semble/types/api/common';
import {
  UrlMetadata,
  UrlMetadataProps,
} from 'src/modules/cards/domain/value-objects/UrlMetadata';
import { Chunk } from '../value-objects/Chunk';
import { UrlType } from 'src/modules/cards/domain/value-objects/UrlType';

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

  async semanticSearchUrls(
    query: string,
    options: {
      limit: number;
      threshold?: number;
      urlType?: UrlType;
      callingUserId?: string;
    },
  ): Promise<Result<UrlView[]>> {
    try {
      const searchParams: SemanticSearchUrlsParams = {
        query,
        limit: options.limit * 2, // Get more results to account for filtering
        threshold: options.threshold,
        urlType: options.urlType,
      };

      return await this.processSemanticSearchResults(searchParams, options);
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
    },
  ): Promise<Result<UrlView[]>> {
    // 1. Search URLs from vector database
    const searchResult =
      await this.vectorDatabase.semanticSearchUrls(searchParams);
    if (searchResult.isErr()) {
      return err(
        new Error(`Vector search failed: ${searchResult.error.message}`),
      );
    }

    // 2. Filter out excluded URL and results with insufficient content
    const filteredResults = searchResult.value.filter((result) => {
      // Filter out the excluded URL if specified
      if (options.excludeUrl && result.url === options.excludeUrl) {
        return false;
      }

      // Create UrlMetadata from the search result metadata
      const metadataResult = UrlMetadata.create(result.metadata);
      if (metadataResult.isErr()) {
        return false;
      }
      const chunk = Chunk.create(metadataResult.value);
      return chunk.meetsMinLength();
    });

    // 3. Limit to requested amount after filtering
    const limitedResults = filteredResults.slice(0, options.limit);

    // 4. Enrich results with library counts and context
    const enrichedUrls = await this.enrichUrlsWithContext(
      limitedResults,
      options.callingUserId,
    );

    return ok(enrichedUrls);
  }

  private async enrichUrlsWithContext(
    searchResults: Array<{
      url: string;
      similarity: number;
      metadata: UrlMetadataProps;
    }>,
    callingUserId?: string,
  ): Promise<UrlView[]> {
    // Enrich each URL with library context
    const enrichedResults = await Promise.all(
      searchResults.map(async (result) => {
        // Get library information for this URL
        const librariesResult =
          await this.cardQueryRepository.getLibrariesForUrl(result.url, {
            page: 1,
            limit: 1000, // Get all libraries to count them
            sortBy: CardSortField.CREATED_AT,
            sortOrder: SortOrder.DESC,
          });

        const urlLibraryCount = librariesResult.totalCount;

        // Check if calling user has this URL in their library
        // Default to false if no calling user (unauthenticated request)
        const urlInLibrary = callingUserId
          ? librariesResult.items.some(
              (library) => library.userId === callingUserId,
            )
          : false;

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
          urlLibraryCount,
          urlInLibrary,
        };
      }),
    );

    return enrichedResults;
  }
}
