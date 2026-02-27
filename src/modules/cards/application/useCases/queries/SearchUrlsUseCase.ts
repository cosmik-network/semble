import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { UrlView, UrlMetadata, PaginationDTO } from '@semble/types';
import { UrlType } from '../../../domain/value-objects/UrlType';

export interface SearchUrlsQuery {
  searchQuery: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
}

export interface SearchUrlsResult {
  urls: UrlView[];
  pagination: PaginationDTO;
  sorting: {
    sortBy: CardSortField;
    sortOrder: SortOrder;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SearchUrlsUseCase
  implements UseCase<SearchUrlsQuery, Result<SearchUrlsResult>>
{
  constructor(private cardQueryRepo: ICardQueryRepository) {}

  async execute(query: SearchUrlsQuery): Promise<Result<SearchUrlsResult>> {
    // Validate search query
    if (!query.searchQuery || query.searchQuery.trim().length === 0) {
      return err(new ValidationError('Search query is required'));
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    // Validate urlType if provided
    if (query.urlType && !Object.values(UrlType).includes(query.urlType)) {
      return err(new ValidationError(`Invalid URL type: ${query.urlType}`));
    }

    try {
      // Execute search query
      const result = await this.cardQueryRepo.searchUrls({
        searchQuery: query.searchQuery.trim(),
        page,
        limit,
        sortBy,
        sortOrder,
        urlType: query.urlType,
      });

      // Extract unique URLs from results
      const urls = result.items.map((item) => item.url);

      // Fetch URL metadata and library info for all URLs in a single batch query
      const urlLibraryInfoMap = await this.cardQueryRepo.getBatchUrlLibraryInfo(
        urls,
        query.callingUserId,
      );

      // Map to UrlView DTOs with enriched data
      const enrichedUrls: UrlView[] = result.items
        .map((item) => {
          const urlInfo = urlLibraryInfoMap.get(item.url);
          if (!urlInfo) {
            // Skip URLs where we couldn't fetch info
            return null;
          }

          // Convert metadata dates to ISO strings
          const metadata: UrlMetadata = {
            url: urlInfo.metadata.url,
            title: urlInfo.metadata.title,
            description: urlInfo.metadata.description,
            author: urlInfo.metadata.author,
            publishedDate: urlInfo.metadata.publishedDate?.toISOString(),
            siteName: urlInfo.metadata.siteName,
            imageUrl: urlInfo.metadata.imageUrl,
            type: urlInfo.metadata.type,
            retrievedAt: urlInfo.metadata.retrievedAt?.toISOString(),
            doi: urlInfo.metadata.doi,
            isbn: urlInfo.metadata.isbn,
          };

          const urlView: UrlView = {
            url: item.url,
            metadata,
            urlLibraryCount: urlInfo.urlLibraryCount,
            urlInLibrary: urlInfo.urlInLibrary,
          };

          return urlView;
        })
        .filter((item): item is UrlView => item !== null);

      return ok({
        urls: enrichedUrls,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.totalCount / limit),
          totalCount: result.totalCount,
          hasMore: page * limit < result.totalCount,
          limit,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to search URLs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
