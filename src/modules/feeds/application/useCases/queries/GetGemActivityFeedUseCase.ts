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
      const page = query.page || 1;

      // Start with a multiplier to account for filtering
      let multiplier = 3;
      let allFilteredItems: GetGlobalFeedResult['activities'] = [];
      let totalFetched = 0;
      let hasMore = true;
      let nextCursor = query.beforeActivityId;

      // Keep fetching until we have enough filtered items or no more data
      while (allFilteredItems.length < requestedLimit && hasMore) {
        const fetchLimit = Math.floor(
          Math.min(requestedLimit * multiplier, 100),
        ); // Cap at 100 per API call

        const globalFeedResult = await this.getGlobalFeedUseCase.execute({
          ...query,
          limit: fetchLimit,
          page: 1, // Always use page 1 when using cursor-based pagination
          beforeActivityId: nextCursor,
        });

        if (globalFeedResult.isErr()) {
          return err(globalFeedResult.error);
        }

        const globalFeed = globalFeedResult.value;

        // Filter activities that have collections with both "💎" and "2025" in the title
        const filteredActivities = globalFeed.activities.filter((activity) => {
          return (
            activity.collections &&
            activity.collections.length > 0 &&
            activity.collections.some((collection) => {
              const title = collection.name.toLowerCase();
              return title.includes('💎') && title.includes('2025');
            })
          );
        });

        allFilteredItems = [...allFilteredItems, ...filteredActivities];
        totalFetched += globalFeed.activities.length;
        hasMore = globalFeed.pagination.hasMore;
        nextCursor = globalFeed.pagination.nextCursor;

        // If we didn't get any new items and there's no more data, break
        if (globalFeed.activities.length === 0 || !hasMore) {
          break;
        }

        // Increase multiplier for next iteration if we're still short
        multiplier = Math.min(multiplier * 1.5, 10); // Cap multiplier at 10
      }

      // Take only the requested number of items
      const finalItems = allFilteredItems.slice(0, requestedLimit);

      // Calculate if there are more filtered items available
      const hasMoreFiltered =
        allFilteredItems.length > requestedLimit ||
        (hasMore && allFilteredItems.length === requestedLimit);

      // For pagination, we need to determine the next cursor
      // Use the last item's ID as the cursor if we have items
      const finalNextCursor =
        finalItems.length > 0 && hasMoreFiltered
          ? finalItems[finalItems.length - 1]?.id
          : undefined;

      return ok({
        activities: finalItems,
        pagination: {
          currentPage: page,
          totalPages: 1, // We can't accurately calculate this due to filtering
          totalCount: finalItems.length, // This is approximate
          hasMore: hasMoreFiltered,
          limit: requestedLimit,
          nextCursor: finalNextCursor,
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
