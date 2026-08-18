import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetUrlStatusForMyLibraryUseCase } from '../../../application/useCases/queries/GetUrlStatusForMyLibraryUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class GetUrlStatusForMyLibraryController extends Controller {
  constructor(
    private getUrlStatusForMyLibraryUseCase: GetUrlStatusForMyLibraryUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url } = req.query;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL query parameter is required');
      }

      const result = await this.getUrlStatusForMyLibraryUseCase.execute({
        url,
        curatorId,
      });

      if (result.isErr()) {
        // Check if the error is an authentication error
        if (result.error instanceof AuthenticationError) {
          return this.unauthorized(
            res,
            result.error.message,
            'PDS_SESSION_EXPIRED',
          );
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
