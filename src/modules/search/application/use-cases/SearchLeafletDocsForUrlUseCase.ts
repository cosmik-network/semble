import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import {
  SearchLeafletDocsForUrlParams,
  SearchLeafletDocsForUrlResponse,
} from '@semble/types';
import { ILeafletSearchService } from '../../domain/services/ILeafletSearchService';
import { ICardQueryRepository } from 'src/modules/cards/domain/ICardQueryRepository';
import {
  CardSortField,
  SortOrder,
} from 'src/modules/cards/domain/ICardQueryRepository';

export interface SearchLeafletDocsForUrlRequest
  extends SearchLeafletDocsForUrlParams {
  userDid?: string; // Optional - for authenticated features
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
  constructor(
    private leafletSearchService: ILeafletSearchService,
    private cardQueryRepository: ICardQueryRepository,
  ) {}

  async execute(
    request: SearchLeafletDocsForUrlRequest,
  ): Promise<SearchLeafletDocsForUrlResult> {
    try {
      if (!request.url || typeof request.url !== 'string') {
        return err(
          new AppError.UnexpectedError(new Error('URL parameter is required')),
        );
      }

      const searchResult =
        await this.leafletSearchService.searchLeafletDocsForUrl(
          request.url,
          request.limit,
          request.cursor,
        );

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const { documents, cursor, total } = searchResult.value;

      // Enrich URLs with library information
      const urls = await Promise.all(
        documents.map(async (doc) => {
          // Get library information for this URL
          const librariesResult =
            await this.cardQueryRepository.getLibrariesForUrl(doc.url, {
              page: 1,
              limit: 1000, // Get all libraries to count them
              sortBy: CardSortField.CREATED_AT,
              sortOrder: SortOrder.DESC,
            });

          const urlLibraryCount = librariesResult.totalCount;

          // Check if calling user has this URL in their library
          // Default to false if no calling user (unauthenticated request)
          const urlInLibrary = request.userDid
            ? librariesResult.items.some(
                (library) => library.userId === request.userDid,
              )
            : false;

          return {
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
            },
            urlLibraryCount,
            urlInLibrary,
          };
        }),
      );

      return ok({
        urls,
        cursor,
        total,
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
