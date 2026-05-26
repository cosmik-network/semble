import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { CreateApiKeyUseCase } from '../../../application/use-cases/CreateApiKeyUseCase';
import { CreateApiKeyRequest } from '@semble/types';

export class CreateApiKeyController extends Controller {
  constructor(private createApiKeyUseCase: CreateApiKeyUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userDid = req.did;
    if (!userDid) return this.unauthorized(res, 'User not authenticated');

    const body = req.body as CreateApiKeyRequest;
    const result = await this.createApiKeyUseCase.execute({
      userDid,
      name: body.name,
    });
    if (result.isErr()) return this.fail(res, result.error.message);
    return this.ok(res, result.value);
  }
}
