import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetConnectionsForUrlUseCase } from '../../../application/useCases/queries/GetConnectionsForUrlUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import {
  ConnectionSortField,
  SortOrder,
  ConnectionAnchorType,
} from '../../../domain/IConnectionQueryRepository';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';

export class GetConnectionsForUrlController extends Controller {
  constructor(
    private getConnectionsForUrlUseCase: GetConnectionsForUrlUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url } = req.query;
      const callingUserId = req.did;

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL is required');
      }

      // Parse direction parameter
      const direction =
        (req.query.direction as 'forward' | 'backward' | 'both') || 'both';

      // Validate direction
      if (!['forward', 'backward', 'both'].includes(direction)) {
        return this.badRequest(
          res,
          'Invalid direction. Must be "forward", "backward", or "both"',
        );
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

      // Parse anchor type filter — which endpoint kind anchors a connection
      // to the URL: the URL itself or an annotation card on it
      const anchorType = req.query.anchorType as
        | ConnectionAnchorType
        | undefined;
      if (anchorType && !['URL', 'ANNOTATION'].includes(anchorType)) {
        return this.badRequest(
          res,
          'Invalid anchorType. Must be "URL" or "ANNOTATION"',
        );
      }

      const result = await this.getConnectionsForUrlUseCase.execute({
        url,
        direction,
        callingUserId,
        page,
        limit,
        sortBy,
        sortOrder,
        connectionTypes,
        anchorType,
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
