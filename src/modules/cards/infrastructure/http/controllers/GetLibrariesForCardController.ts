import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetLibrariesForCardUseCase } from '../../../application/useCases/queries/GetLibrariesForCardUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetLibrariesForCardController extends Controller {
  constructor(private getLibrariesForCardUseCase: GetLibrariesForCardUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.query as Record<string, string>;

      if (!cardId) {
        return this.badRequest(res, 'Card ID is required');
      }

      const result = await this.getLibrariesForCardUseCase.execute({ cardId });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
