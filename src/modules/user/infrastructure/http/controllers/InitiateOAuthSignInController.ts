import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { InitiateOAuthSignInUseCase } from '../../../application/use-cases/InitiateOAuthSignInUseCase';

export class InitiateOAuthSignInController extends Controller {
  constructor(private initiateOAuthSignInUseCase: InitiateOAuthSignInUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { handle, client } = req.query;

      const result = await this.initiateOAuthSignInUseCase.execute({
        handle: handle as string | undefined,
        client: client === 'native' ? 'native' : undefined,
      });

      if (result.isErr()) {
        return this.fail(res, result.error.message);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
