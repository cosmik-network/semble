import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetUrlMetadataUseCase } from '../../../application/useCases/queries/GetUrlMetadataUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetUrlMetadataController extends Controller {
  constructor(private getUrlMetadataUseCase: GetUrlMetadataUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, includeStats } = req.query;

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL query parameter is required');
      }

      // Parse includeStats as boolean
      const includeStatsParam = includeStats === 'true' || includeStats === '1';

      const result = await this.getUrlMetadataUseCase.execute({
        url,
        includeStats: includeStatsParam,
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
