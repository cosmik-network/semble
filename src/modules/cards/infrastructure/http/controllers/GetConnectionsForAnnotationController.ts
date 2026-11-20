import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetConnectionsForAnnotationUseCase } from '../../../application/useCases/queries/GetConnectionsForAnnotationUseCase';
import {
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';

export class GetConnectionsForAnnotationController extends Controller {
  constructor(
    private getConnectionsForAnnotationUseCase: GetConnectionsForAnnotationUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, exact } = req.query;
      const callingUserId = req.did;

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL is required');
      }
      if (!exact || typeof exact !== 'string') {
        return this.badRequest(res, 'exact is required');
      }

      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;

      // Parse sorting parameters
      const sortBy =
        (req.query.sortBy as ConnectionSortField) ||
        ConnectionSortField.CREATED_AT;
      const sortOrder = (req.query.sortOrder as SortOrder) || SortOrder.DESC;

      // Parse connection types filter
      const connectionTypes = req.query.connectionTypes as
        | ConnectionTypeEnum[]
        | undefined;

      const result = await this.getConnectionsForAnnotationUseCase.execute({
        url,
        exact,
        callingUserId,
        page,
        limit,
        sortBy,
        sortOrder,
        connectionTypes,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
