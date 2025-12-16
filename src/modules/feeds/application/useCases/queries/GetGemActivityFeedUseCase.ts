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
      const requestedLimit = query.limit || 20;
      const cutoffDate = new Date('2025-12-05T00:00:00Z');

      let filteredItems: GetGlobalFeedResult['activities'] = [];
      let currentCursor = query.beforeActivityId;
      let hasMoreGlobal = true;
      let reachedCutoff = false;

      // Keep fetching until we have enough filtered items or reach the end
      while (filteredItems.length < requestedLimit && hasMoreGlobal && !reachedCutoff) {
        // Fetch a larger batch to account for filtering
        const batchSize = Math.min(requestedLimit * 3, 100);
        
        const globalFeedResult = await this.getGlobalFeedUseCase.execute({
          page: 1, // Always use page 1 for cursor-based pagination
          limit: batchSize,
          beforeActivityId: currentCursor,
          callingUserId: query.callingUserId,
        });

        if (globalFeedResult.isErr()) {
          return err(globalFeedResult.error);
        }

        const globalFeed = globalFeedResult.value;
        
        // Check if we've reached the cutoff date
        if (globalFeed.activities.length > 0) {
          const oldestActivityDate = new Date(
            globalFeed.activities[globalFeed.activities.length - 1]!.createdAt
          );
          
          if (oldestActivityDate < cutoffDate) {
            // Filter activities to only include those after cutoff
            const recentActivities = globalFeed.activities.filter(
              (activity) => new Date(activity.createdAt) >= cutoffDate
            );
            
            // Apply gem filter to recent activities
            const newFilteredItems = recentActivities.filter(this.isGemActivity);
            filteredItems = [...filteredItems, ...newFilteredItems];
            reachedCutoff = true;
            break;
          }
        }

        // Apply gem filter to all activities in this batch
        const newFilteredItems = globalFeed.activities.filter(this.isGemActivity);
        filteredItems = [...filteredItems, ...newFilteredItems];

        // Update cursor and pagination state
        hasMoreGlobal = globalFeed.pagination.hasMore;
        currentCursor = globalFeed.pagination.nextCursor;

        // If no more global data, stop
        if (!hasMoreGlobal || globalFeed.activities.length === 0) {
          break;
        }
      }

      // Take only the requested number of items
      const finalItems = filteredItems.slice(0, requestedLimit);
      
      // Determine if there are more filtered items available
      const hasMore = filteredItems.length > requestedLimit || 
                     (hasMoreGlobal && !reachedCutoff && filteredItems.length === requestedLimit);

      // Set next cursor based on the last item we're returning
      const nextCursor = finalItems.length > 0 && hasMore 
        ? finalItems[finalItems.length - 1]?.id 
        : undefined;

      return ok({
        activities: finalItems,
        pagination: {
          currentPage: query.page || 1,
          totalPages: 1, // Can't calculate accurately due to filtering
          totalCount: finalItems.length, // Approximate
          hasMore,
          limit: requestedLimit,
          nextCursor,
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private isGemActivity(activity: GetGlobalFeedResult['activities'][0]): boolean {
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
