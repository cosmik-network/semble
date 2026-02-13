import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetFollowingUsersUseCase } from '../../../application/useCases/queries/GetFollowingUsersUseCase';

export class GetFollowingUsersController extends Controller {
  constructor(private getFollowingUsersUseCase: GetFollowingUsersUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;
      const { page, limit } = req.query;
      const callingUserId = (req as any).did;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result = await this.getFollowingUsersUseCase.execute({
        userId: identifier,
        callingUserId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
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
