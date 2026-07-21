import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { ExchangeAuthCodeUseCase } from '../../../application/use-cases/ExchangeAuthCodeUseCase';
import { ExchangeAuthCodeErrors } from '../../../application/use-cases/errors/ExchangeAuthCodeErrors';

export class ExchangeAuthCodeController extends Controller {
  constructor(private exchangeAuthCodeUseCase: ExchangeAuthCodeUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { code } = req.body;

      const result = await this.exchangeAuthCodeUseCase.execute({ code });

      if (result.isErr()) {
        if (result.error instanceof ExchangeAuthCodeErrors.CodeNotFoundError) {
          return this.badRequest(res, result.error.message);
        }
        return this.fail(res, result.error.message);
      }

      // Return the TokenPair in the body — no cookies for the native client.
      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error.message || 'Unknown error');
    }
  }
}
