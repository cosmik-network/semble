import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { ListApiKeysUseCase } from '../../../application/use-cases/ListApiKeysUseCase';

export class ListApiKeysController extends Controller {
  constructor(private listApiKeysUseCase: ListApiKeysUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userDid = req.did;
    if (!userDid) return this.unauthorized(res, 'User not authenticated');

    const result = await this.listApiKeysUseCase.execute({ userDid });
    if (result.isErr()) return this.fail(res, result.error.message);
    return this.ok(res, result.value);
  }
}
