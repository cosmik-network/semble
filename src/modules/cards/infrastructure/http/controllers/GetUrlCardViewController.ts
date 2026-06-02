import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetUrlCardViewUseCase } from '../../../application/useCases/queries/GetUrlCardViewUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetUrlCardViewController extends Controller {
  constructor(private getUrlCardViewUseCase: GetUrlCardViewUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.query as Record<string, string>;
      const callerDid = req.did;

      if (!cardId) {
        return this.badRequest(res, 'Card ID is required');
      }

      const result = await this.getUrlCardViewUseCase.execute({
        cardId,
        callingUserId: callerDid,
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
