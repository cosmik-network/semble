import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetAnnotationStatusForMyLibraryUseCase } from '../../../application/useCases/queries/GetAnnotationStatusForMyLibraryUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class GetAnnotationStatusForMyLibraryController extends Controller {
  constructor(
    private getAnnotationStatusForMyLibraryUseCase: GetAnnotationStatusForMyLibraryUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, exact } = req.query;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL query parameter is required');
      }

      if (!exact || typeof exact !== 'string') {
        return this.badRequest(res, 'exact query parameter is required');
      }

      const result = await this.getAnnotationStatusForMyLibraryUseCase.execute({
        url,
        exact,
        curatorId,
      });

      if (result.isErr()) {
        // Check if the error is an authentication error
        if (result.error instanceof AuthenticationError) {
          return this.handleError(res, result.error);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
