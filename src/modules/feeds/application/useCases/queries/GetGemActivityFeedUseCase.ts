import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import {
  GetGlobalFeedUseCase,
  GetGlobalFeedQuery,
  GetGlobalFeedResult,
} from './GetGlobalFeedUseCase';

export interface GetGemActivityFeedQuery extends GetGlobalFeedQuery {}

export type GetGemActivityFeedResult = GetGlobalFeedResult;

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetGemActivityFeedUseCase
  implements
    UseCase<
      GetGemActivityFeedQuery,
      Result<
        GetGemActivityFeedResult,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(private getGlobalFeedUseCase: GetGlobalFeedUseCase) {}

  async execute(
    query: GetGemActivityFeedQuery,
  ): Promise<
    Result<GetGemActivityFeedResult, ValidationError | AppError.UnexpectedError>
  > {
    try {
      const page = query.page || 1;
      const requestedLimit = query.limit || 20;
      const cutoffDate = new Date('2025-12-05T00:00:00Z');

      let filteredItems: GetGlobalFeedResult['activities'] = [];
      let currentGlobalPage = 1;
      let hasMoreGlobal = true;
      let reachedCutoff = false;

      // Calculate how many filtered items we need to skip for pagination
      const skipCount = (page - 1) * requestedLimit;
      const totalNeeded = skipCount + requestedLimit;

      // Keep fetching until we have enough filtered items
      while (
        filteredItems.length < totalNeeded &&
        hasMoreGlobal &&
        !reachedCutoff
      ) {
        // Fetch larger batches to account for filtering
        const batchSize = Math.min(requestedLimit * 15, 300);

        const globalFeedResult = await this.getGlobalFeedUseCase.execute({
          page: currentGlobalPage,
          limit: batchSize,
          callingUserId: query.callingUserId,
        });

        if (globalFeedResult.isErr()) {
          return err(globalFeedResult.error);
        }

        const globalFeed = globalFeedResult.value;

        // Check if we've reached the cutoff date
        if (globalFeed.activities.length > 0) {
          const oldestActivityDate = new Date(
            globalFeed.activities[globalFeed.activities.length - 1]!.createdAt,
          );

          if (oldestActivityDate < cutoffDate) {
            // Filter activities to only include those after cutoff
            const recentActivities = globalFeed.activities.filter(
              (activity) => new Date(activity.createdAt) >= cutoffDate,
            );

            // Apply gem filter to recent activities
            const newFilteredItems = recentActivities.filter(
              this.isGemActivity,
            );
            filteredItems = [...filteredItems, ...newFilteredItems];
            reachedCutoff = true;
            break;
          }
        }

        // Apply gem filter to all activities in this batch
        const newFilteredItems = globalFeed.activities.filter(
          this.isGemActivity,
        );
        filteredItems = [...filteredItems, ...newFilteredItems];

        // Update pagination state
        hasMoreGlobal = globalFeed.pagination.hasMore;
        currentGlobalPage++;

        // If no more global data, stop
        if (!hasMoreGlobal || globalFeed.activities.length === 0) {
          break;
        }
      }

      // Apply pagination to filtered results
      const paginatedItems = filteredItems.slice(
        skipCount,
        skipCount + requestedLimit,
      );

      // Determine if there are more pages
      const hasMore =
        filteredItems.length > skipCount + requestedLimit ||
        (hasMoreGlobal && !reachedCutoff);

      return ok({
        activities: paginatedItems,
        pagination: {
          currentPage: page,
          totalPages: hasMore ? page + 1 : page, // Can't calculate exact total due to filtering
          totalCount: filteredItems.length, // Approximate
          hasMore,
          limit: requestedLimit,
          // Remove nextCursor since we're using page-based pagination
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private isGemActivity(
    activity: GetGlobalFeedResult['activities'][0],
  ): boolean {
    return (
      activity.collections &&
      activity.collections.length > 0 &&
      activity.collections.some((collection) => {
        const title = collection.name.toLowerCase();
        return title.includes('💎') && title.includes('2025');
      })
    );
  }
}
