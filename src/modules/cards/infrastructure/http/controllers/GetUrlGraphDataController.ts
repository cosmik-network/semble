import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetUrlSubGraphUseCase } from '../../../application/useCases/queries/GetUrlSubGraphUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetUrlGraphDataController extends Controller {
  constructor(private getUrlSubGraphUseCase: GetUrlSubGraphUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      // Parse URL parameter from query string
      const url = req.query.url as string;
      if (!url) {
        return this.badRequest(res, 'URL parameter is required');
      }

      // Parse depth parameter from query string (default 1, max 5)
      const depth = req.query.depth
        ? Math.max(1, Math.min(5, parseInt(req.query.depth as string, 10)))
        : 1;

      const result = await this.getUrlSubGraphUseCase.execute({ url, depth });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      // Build response without pagination (depth limits result set)
      const response = {
        nodes: result.value.nodes,
        edges: result.value.edges,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: result.value.totalNodeCount,
          hasMore: false,
          limit: result.value.totalNodeCount,
        },
      };

      return this.ok(res, response);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
