import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { RevokeApiKeyUseCase } from '../../../application/use-cases/RevokeApiKeyUseCase';
import { ApiKeyErrors } from '../../../application/use-cases/errors/ApiKeyErrors';
import { RevokeApiKeyRequest } from '@semble/types';

export class RevokeApiKeyController extends Controller {
  constructor(private revokeApiKeyUseCase: RevokeApiKeyUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userDid = req.did;
    if (!userDid) return this.unauthorized(res, 'User not authenticated');

    const body = req.body as RevokeApiKeyRequest;
    const result = await this.revokeApiKeyUseCase.execute({
      userDid,
      id: body.id,
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
