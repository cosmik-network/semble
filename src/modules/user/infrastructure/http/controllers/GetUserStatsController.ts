import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetUserStatsUseCase } from '../../../application/useCases/queries/GetUserStatsUseCase';
import {
  UserStatType,
  TimeInterval,
} from '../../../domain/IUserStatsRepository';

export class GetUserStatsController extends Controller {
  constructor(private getUserStatsUseCase: GetUserStatsUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      // Extract query parameters
      const { type, interval, limit } = req.query;

      // Validate required parameter
      if (!type) {
        return this.fail(res, 'Stat type is required');
      }

      // Parse and validate limit if provided
      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
      if (parsedLimit !== undefined && isNaN(parsedLimit)) {
        return this.fail(res, 'Limit must be a valid number');
      }

      // Execute the use case
      const result = await this.getUserStatsUseCase.execute({
        statType: type as UserStatType,
        interval: interval as TimeInterval | undefined,
        limit: parsedLimit,
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
