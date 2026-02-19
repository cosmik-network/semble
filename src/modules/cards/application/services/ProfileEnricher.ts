import { Result, ok, err } from '../../../../shared/core/Result';
import { IProfileService } from '../../domain/services/IProfileService';
import { User } from '@semble/types';
import { BatchProfileFetcher } from './BatchProfileFetcher';
import { ProfileMapper } from '../mappers/ProfileMapper';

/**
 * ProfileEnricher - High-level service for enriching items with author profiles
 *
 * Provides a simple API to replace the extract → fetch → map pattern
 * used across all query use cases
 */
export class ProfileEnricher {
  private batchFetcher: BatchProfileFetcher;

  constructor(private profileService: IProfileService) {
    this.batchFetcher = new BatchProfileFetcher(profileService);
  }

  /**
   * Enrich a collection of items with author profiles
   *
   * @param items - Array of items to enrich
   * @param getAuthorId - Function to extract author ID from each item
   * @param callingUserId - Optional calling user ID for isFollowing status
   * @param options - Fetch options (skipFailures, includeFallback)
   * @returns Result with items enriched with 'author' field
   *
   * @example
   * const enriched = await enricher.enrichWithAuthors(
   *   cards,
   *   (card) => card.authorId,
   *   callingUserId
   * );
   */
  async enrichWithAuthors<T extends Record<string, any>>(
    items: T[],
    getAuthorId: (item: T) => string,
    callingUserId?: string,
    options?: {
      skipFailures?: boolean;
      includeFallback?: boolean;
      mapToUser?: boolean; // If true, map to User (with isFollowing), else use inline profile
    },
  ): Promise<Result<(T & { author: User })[]>> {
    // Extract unique author IDs
    const authorIds = Array.from(new Set(items.map(getAuthorId)));

    // Fetch all profiles
    const profileMapResult = await this.batchFetcher.fetchProfileMap(
      authorIds,
      callingUserId,
      {
        skipFailures: options?.skipFailures ?? false,
        includeFallback: options?.includeFallback ?? false,
      },
    );

    if (profileMapResult.isErr()) {
      return err(profileMapResult.error);
    }

    const profileMap = profileMapResult.value;
    const mapToUser = options?.mapToUser ?? true;

    // Enrich items with author profiles
    const enrichedItems: (T & { author: User })[] = [];

    for (const item of items) {
      const authorId = getAuthorId(item);
      const profile = profileMap.get(authorId);

      if (!profile) {
        if (options?.skipFailures) {
          // Skip this item if we're allowing failures
          continue;
        }
        return err(new Error(`Profile not found for author ${authorId}`));
      }

      const author = mapToUser
        ? ProfileMapper.toUser(profile)
        : (ProfileMapper.toInlineProfile(profile) as User);

      enrichedItems.push({
        ...item,
        author,
      });
    }

    return ok(enrichedItems);
  }

  /**
   * Build a profile map for later enrichment
   * Useful when you need to enrich multiple different collections with the same profiles
   *
   * @param userIds - Array of user IDs to fetch
   * @param callingUserId - Optional calling user ID
   * @param options - Fetch options
   * @returns Map of userId -> User (API DTO)
   */
  async buildProfileMap(
    userIds: string[],
    callingUserId?: string,
    options?: {
      skipFailures?: boolean;
      includeFallback?: boolean;
      mapToUser?: boolean;
    },
  ): Promise<Result<Map<string, User>>> {
    const profileMapResult = await this.batchFetcher.fetchProfileMap(
      userIds,
      callingUserId,
      {
        skipFailures: options?.skipFailures ?? false,
        includeFallback: options?.includeFallback ?? false,
      },
    );

    if (profileMapResult.isErr()) {
      return err(profileMapResult.error);
    }

    const profileMap = profileMapResult.value;
    const mapToUser = options?.mapToUser ?? true;
    const userMap = new Map<string, User>();

    for (const [userId, profile] of profileMap.entries()) {
      const user = mapToUser
        ? ProfileMapper.toUser(profile)
        : (ProfileMapper.toInlineProfile(profile) as User);
      userMap.set(userId, user);
    }

    return ok(userMap);
  }
}
