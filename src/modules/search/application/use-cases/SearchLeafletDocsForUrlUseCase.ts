import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { LeafletSearchService } from '../../domain/services/LeafletSearchService';
import {
  SearchLeafletDocsForUrlParams,
  SearchLeafletDocsForUrlResponse,
} from '@semble/types';

export interface SearchLeafletDocsForUrlRequest
  extends SearchLeafletDocsForUrlParams {
  userDid?: string; // Optional - for future authenticated features
}

export type SearchLeafletDocsForUrlResult = Result<
  SearchLeafletDocsForUrlResponse,
  AppError.UnexpectedError
>;

export class SearchLeafletDocsForUrlUseCase
  implements
    UseCase<
      SearchLeafletDocsForUrlRequest,
      Promise<SearchLeafletDocsForUrlResult>
    >
{
  constructor(private leafletSearchService: LeafletSearchService) {}

  async execute(
    request: SearchLeafletDocsForUrlRequest,
  ): Promise<SearchLeafletDocsForUrlResult> {
    try {
      if (!request.url || typeof request.url !== 'string') {
        return err(
          new AppError.UnexpectedError(
            new Error('URL parameter is required'),
          ),
        );
      }

      const searchResult = await this.leafletSearchService.searchLeafletDocsForUrl(
        request.url,
        request.limit,
        request.cursor,
      );

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const documents = searchResult.value;

      // Transform to UrlView format to match other search endpoints
      const urls = documents.map((doc) => ({
        url: doc.url,
        metadata: {
          url: doc.metadata.url,
          title: doc.metadata.title,
          description: doc.metadata.description,
          author: doc.metadata.author,
          publishedDate: doc.metadata.publishedDate?.toISOString(),
          siteName: doc.metadata.siteName,
          imageUrl: doc.metadata.imageUrl,
          type: doc.metadata.type?.toString(),
          retrievedAt: doc.metadata.retrievedAt?.toISOString(),
        },
        urlLibraryCount: 0, // We don't have this data from Leaflet
        urlInLibrary: false, // We don't have this data without user context
      }));

      return ok({
        urls,
        cursor: undefined, // Constellation API doesn't seem to use cursors in the example
        total: documents.length,
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
