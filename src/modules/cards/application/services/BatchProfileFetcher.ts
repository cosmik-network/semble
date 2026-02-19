import { Result, ok, err } from '../../../../shared/core/Result';
import {
  IProfileService,
  UserProfile,
} from '../../domain/services/IProfileService';
import { ProfileMapper } from '../mappers/ProfileMapper';

export interface BatchProfileFetchOptions {
  /**
   * If true, skip profiles that fail to fetch and continue
   * If false (default), return an error if any profile fetch fails
   */
  skipFailures?: boolean;

  /**
   * If true, include fallback "Unknown User" profiles for failed fetches
   * Only used when skipFailures is true
   */
  includeFallback?: boolean;
}

/**
 * BatchProfileFetcher - Centralizes the pattern of fetching multiple profiles
 * and building a Map<userId, profile>
 *
 * This eliminates ~50-100 lines of repetitive code per use case
 */
export class BatchProfileFetcher {
  constructor(private profileService: IProfileService) {}

  /**
   * Fetch multiple profiles and return a Map<userId, UserProfile>
   *
   * @param userIds - Array of user IDs to fetch profiles for
   * @param callingUserId - Optional calling user ID for isFollowing status
   * @param options - Fetch options (skipFailures, includeFallback)
   * @returns Result<Map<userId, UserProfile>>
   */
  async fetchProfileMap(
    userIds: string[],
    callingUserId?: string,
    options?: BatchProfileFetchOptions,
  ): Promise<Result<Map<string, UserProfile>>> {
    const skipFailures = options?.skipFailures ?? false;
    const includeFallback = options?.includeFallback ?? false;

    // Remove duplicates
    const uniqueUserIds = Array.from(new Set(userIds));

    // Fetch all profiles in parallel
    const profilePromises = uniqueUserIds.map((userId) =>
      this.profileService.getProfile(userId, callingUserId),
    );

    const profileResults = await Promise.all(profilePromises);

    // Build the profile map
    const profileMap = new Map<string, UserProfile>();
    const errors: string[] = [];

    for (let i = 0; i < uniqueUserIds.length; i++) {
      const userId = uniqueUserIds[i];
      const profileResult = profileResults[i];

      if (!userId) {
        errors.push('Missing user ID at index ' + i);
        continue;
      }

      if (!profileResult) {
        errors.push(`No profile result for user ${userId}`);
        continue;
      }

      if (profileResult.isErr()) {
        const errorMsg = `Failed to fetch profile for user ${userId}: ${
          profileResult.error instanceof Error
            ? profileResult.error.message
            : 'Unknown error'
        }`;
        errors.push(errorMsg);

        if (skipFailures && includeFallback) {
          // Create a fallback profile
          const fallback = ProfileMapper.createFallbackProfile(userId);
          profileMap.set(userId, {
            id: fallback.id,
            name: fallback.name,
            handle: fallback.handle,
          });
        }
        continue;
      }

      // Successfully fetched profile
      profileMap.set(userId, profileResult.value);
    }

    // If we have errors and we're not skipping failures, return an error
    if (errors.length > 0 && !skipFailures) {
      return err(
        new Error(
          `Failed to fetch some profiles:\n${errors.slice(0, 5).join('\n')}${
            errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''
          }`,
        ),
      );
    }

    return ok(profileMap);
  }

  /**
   * Helper to extract unique user IDs from a collection of items
   *
   * @param items - Array of items
   * @param extractors - Functions to extract user IDs from each item
   * @returns Array of unique user IDs
   *
   * @example
   * const userIds = BatchProfileFetcher.extractUniqueIds(
   *   notifications,
   *   (n) => n.actorUserId,
   *   (n) => n.cardAuthorId
   * );
   */
  static extractUniqueIds<T>(
    items: T[],
    ...extractors: ((item: T) => string | undefined)[]
  ): string[] {
    const userIds = new Set<string>();

    for (const item of items) {
      for (const extractor of extractors) {
        const userId = extractor(item);
        if (userId) {
          userIds.add(userId);
        }
      }
    }

    return Array.from(userIds);
  }
}
