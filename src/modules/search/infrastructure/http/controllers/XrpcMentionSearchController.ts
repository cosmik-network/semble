import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { SearchUrlsUseCase } from '../../../../cards/application/useCases/queries/SearchUrlsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import {
  CardSortField,
  SortOrder,
} from '../../../../cards/domain/ICardQueryRepository';

interface XrpcMentionSearchResult {
  uri: string;
  name: string;
  href: string;
  icon?: string;
  embed?: {
    src: string;
    width: number;
    height: number;
  };
}

export class XrpcMentionSearchController extends Controller {
  constructor(
    private searchUrlsUseCase: SearchUrlsUseCase,
    private appUrl: string,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const serviceUri = req.query.service as string;
      const search = req.query.search as string;
      const scope = req.query.scope as string | undefined;
      const limit = Math.min(
        Math.max(parseInt((req.query.limit as string) || '20'), 1),
        50,
      );

      if (!serviceUri || !search) {
        return this.badRequest(
          res,
          'missing required parameters: service, search',
        );
      }

      const result = await this.searchUrlsUseCase.execute({
        searchQuery: search,
        callingUserId: undefined,
        page: 1,
        limit,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      const mappedResults: XrpcMentionSearchResult[] = result.value.urls.map(
        (urlView) => ({
          uri: urlView.url,
          name: urlView.metadata.title || urlView.url,
          description: urlView.metadata.description,
          href: `${this.appUrl}/url?id=${encodeURIComponent(urlView.url)}`,
          icon: urlView.metadata.imageUrl,
          embed: undefined,
        }),
      );

      return this.ok(res, { results: mappedResults });
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
