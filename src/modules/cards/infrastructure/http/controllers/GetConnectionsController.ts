import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetConnectionsUseCase } from '../../../application/useCases/queries/GetConnectionsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import {
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';

export class GetConnectionsController extends Controller {
  constructor(private getConnectionsUseCase: GetConnectionsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const identifier = req.query.identifier as string | undefined;
      const callingUserId = req.did;

      if (!identifier) {
        return this.badRequest(res, 'User identifier is required');
      }

      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;

      const sortBy =
        (req.query.sortBy as ConnectionSortField) ||
        ConnectionSortField.CREATED_AT;
      const sortOrder = (req.query.sortOrder as SortOrder) || SortOrder.DESC;

      const connectionTypes = req.query.connectionTypes as
        | ConnectionTypeEnum[]
        | undefined;

      const result = await this.getConnectionsUseCase.execute({
        userId: identifier,
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
