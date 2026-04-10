import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  IUserStatsRepository,
  UserGrowthStatsDTO,
  UserEngagementStatsDTO,
  UserStatType,
  TimeInterval,
} from '../../../domain/IUserStatsRepository';

export interface GetUserStatsQuery {
  statType: UserStatType;
  interval?: TimeInterval;
  limit?: number;
  includeTimeSeries?: boolean; // For engagement stats
  // Future parameters can be added here for other stat types
}

export type GetUserStatsResult = UserGrowthStatsDTO | UserEngagementStatsDTO; // Union type for different stat types

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetUserStatsUseCase
  implements UseCase<GetUserStatsQuery, Result<GetUserStatsResult>>
{
  constructor(private userStatsRepository: IUserStatsRepository) {}

  async execute(query: GetUserStatsQuery): Promise<Result<GetUserStatsResult>> {
    try {
      // Validate query parameters
      if (!query.statType) {
        return err(new ValidationError('Stat type is required'));
      }

      // Route to appropriate repository method based on stat type
      switch (query.statType) {
        case 'growth':
          return await this.handleGrowthStats(query);

        case 'engagement':
          return await this.handleEngagementStats(query);

        // Future stat types can be added here
        // case 'activity':
        //   return await this.handleActivityStats(query);

        default:
          return err(
            new ValidationError(`Invalid stat type: ${query.statType}`),
          );
      }
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve user stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private async handleGrowthStats(
    query: GetUserStatsQuery,
  ): Promise<Result<UserGrowthStatsDTO>> {
    // Apply defaults
    const interval = query.interval || 'day';
    const limit = query.limit || 30;

    // Validate parameters
    if (!['day', 'week', 'month'].includes(interval)) {
      return err(new ValidationError(`Invalid interval: ${interval}`));
    }

    if (limit < 1 || limit > 365) {
      return err(new ValidationError('Limit must be between 1 and 365'));
    }

    try {
      const stats = await this.userStatsRepository.getUserGrowthStats({
        interval,
        limit,
      });

      return ok(stats);
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve growth stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private async handleEngagementStats(
    query: GetUserStatsQuery,
  ): Promise<Result<UserEngagementStatsDTO>> {
    // Apply defaults
    const interval = query.interval || 'day';
    const limit = query.limit || 30;
    const includeTimeSeries = query.includeTimeSeries || false;

    // Validate parameters
    if (interval && !['day', 'week', 'month'].includes(interval)) {
      return err(new ValidationError(`Invalid interval: ${interval}`));
    }

    if (limit < 1 || limit > 365) {
      return err(new ValidationError('Limit must be between 1 and 365'));
    }

    try {
      const stats = await this.userStatsRepository.getUserEngagementStats({
        interval,
        limit,
        includeTimeSeries,
      });

      return ok(stats);
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve engagement stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  // Future handler methods can be added here
  // private async handleActivityStats(query: GetUserStatsQuery): Promise<Result<UserActivityStatsDTO>> { ... }
}
