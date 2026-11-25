import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetAnnotationUseCase } from '../../../application/useCases/queries/GetAnnotationUseCase';

export class GetAnnotationController extends Controller {
  constructor(private getAnnotationUseCase: GetAnnotationUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, exact } = req.query;
      const callingUserId = req.did;

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL query parameter is required');
      }
      if (!exact || typeof exact !== 'string') {
        return this.badRequest(res, 'exact query parameter is required');
      }

      const result = await this.getAnnotationUseCase.execute({
        url,
        exact,
        callingUserId,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
