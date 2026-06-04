import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { UpdateApiKeyUseCase } from '../../../application/use-cases/UpdateApiKeyUseCase';
import { ApiKeyErrors } from '../../../application/use-cases/errors/ApiKeyErrors';
import { UpdateApiKeyRequest } from '@semble/types';

export class UpdateApiKeyController extends Controller {
  constructor(private updateApiKeyUseCase: UpdateApiKeyUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userDid = req.did;
    if (!userDid) return this.unauthorized(res, 'User not authenticated');

    const body = req.body as UpdateApiKeyRequest;
    const result = await this.updateApiKeyUseCase.execute({
      userDid,
      id: body.id,
      name: body.name,
    });
    if (result.isErr()) {
      if (result.error instanceof ApiKeyErrors.ApiKeyNotFoundError) {
        return this.notFound(res, result.error.message);
      }
      return this.fail(res, result.error.message);
    }
    return this.ok(res, result.value);
  }
}
