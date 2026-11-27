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
      const { cid, url, exact } = req.query;
      const callingUserId = req.did;

      if (typeof cid !== 'string' && (!url || typeof url !== 'string')) {
        return this.badRequest(
          res,
          'Provide either cid, or both url and exact query parameters',
        );
      }
      if (!cid && (!exact || typeof exact !== 'string')) {
        return this.badRequest(
          res,
          'Provide either cid, or both url and exact query parameters',
        );
      }

      const result = await this.getAnnotationUseCase.execute({
        ...(typeof cid === 'string' ? { cid } : {}),
        ...(typeof url === 'string' ? { url } : {}),
        ...(typeof exact === 'string' ? { exact } : {}),
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
