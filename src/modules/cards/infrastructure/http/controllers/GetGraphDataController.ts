import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetGraphDataUseCase } from '../../../application/useCases/queries/GetGraphDataUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetGraphDataController extends Controller {
  constructor(private getGraphDataUseCase: GetGraphDataUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      // Parse pagination parameters from query string
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 300;

      const result = await this.getGraphDataUseCase.execute({ page, limit });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      // Calculate pagination metadata
      const totalCount = result.value.totalNodeCount;
      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      // Build response with pagination
      const response = {
        nodes: result.value.nodes,
        edges: result.value.edges,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasMore,
          limit,
        },
      };

      return this.ok(res, response);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
