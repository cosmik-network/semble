import { Result } from 'src/shared/core/Result';
import { Follow } from '../Follow';
import { FollowTargetType } from '../value-objects/FollowTargetType';

export interface IFollowsRepository {
  /**
   * Get all followers of a specific target (user or collection).
   *
   * @param targetId - The ID of the entity being followed (User DID or Collection UUID)
   * @param targetType - The type of entity being followed (USER or COLLECTION)
   * @returns Array of Follow records (can be empty if no followers)
   *
   * Example:
   *   getFollowers('did:plc:alice123', FollowTargetType.USER)
   *   → [Follow{ followerId: DID('did:plc:bob456'), targetId: 'did:plc:alice123', ... }]
   */
  getFollowers(
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<Follow[]>>;

  /**
   * Get all followers of multiple collections (combined, deduplicated at use case level).
   *
   * @param collectionIds - Array of collection UUIDs
   * @returns Array of Follow records (can be empty)
   *
   * Example:
   *   getFollowersOfCollections(['uuid-1', 'uuid-2'])
   *   → [
   *       Follow{ followerId: DID('did:plc:bob456'), targetId: 'uuid-1', ... },
   *       Follow{ followerId: DID('did:plc:carol789'), targetId: 'uuid-2', ... }
   *     ]
   *
   * Notes:
   * - Returns empty array if collectionIds is empty
   * - Results may include duplicates if a user follows multiple input collections
   *   (deduplication happens at use case level)
   */
  getFollowersOfCollections(collectionIds: string[]): Promise<Result<Follow[]>>;

  /**
   * Save a follow relationship.
   *
   * @param follow - The follow entity to persist
   * @returns Success or error
   *
   * Idempotency: Uses INSERT ON CONFLICT DO NOTHING on composite key
   */
  save(follow: Follow): Promise<Result<void>>;

  /**
   * Delete a follow relationship.
   *
   * @param followerId - DID of the follower
   * @param targetId - ID of the target (user DID or collection UUID)
   * @param targetType - Type of target
   * @returns Success or error
   *
   * Idempotency: Returns success even if follow doesn't exist
   */
  delete(
    followerId: string,
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<void>>;

  /**
   * Find a specific follow relationship.
   *
   * @param followerId - DID of the follower
   * @param targetId - ID of the target
   * @param targetType - Type of target
   * @returns Follow entity or null if not found
   */
  findByFollowerAndTarget(
    followerId: string,
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<Follow | null>>;

  /**
   * Get paginated list of entities that a user follows.
   *
   * @param followerId - DID of the follower
   * @param targetType - Type of entities to get (USER or COLLECTION)
   * @param options - Pagination options
   * @returns Paginated list of Follow records and total count
   *
   * Example:
   *   getFollowing('did:plc:alice123', FollowTargetType.USER, { page: 1, limit: 20 })
   *   → { follows: [...], totalCount: 45 }
   */
  getFollowing(
    followerId: string,
    targetType: FollowTargetType,
    options: { page: number; limit: number },
  ): Promise<Result<{ follows: Follow[]; totalCount: number }>>;

  /**
   * Get count of entities that a user follows.
   *
   * @param followerId - DID of the follower
   * @param targetType - Optional type filter (USER or COLLECTION)
   * @returns Count of followed entities
   *
   * Example:
   *   getFollowingCount('did:plc:alice123', FollowTargetType.USER) → 45
   *   getFollowingCount('did:plc:alice123') → 60 (all types)
   */
  getFollowingCount(
    followerId: string,
    targetType?: FollowTargetType,
  ): Promise<Result<number>>;

  /**
   * Get count of followers for a specific entity.
   *
   * @param targetId - ID of the entity (user DID or collection UUID)
   * @param targetType - Type of entity
   * @returns Count of followers
   *
   * Example:
   *   getFollowersCount('did:plc:alice123', FollowTargetType.USER) → 150
   *   getFollowersCount('uuid-collection-1', FollowTargetType.COLLECTION) → 25
   */
  getFollowersCount(
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<number>>;

  /**
   * Check if a follower follows multiple targets in a single query.
   *
   * @param followerId - DID of the follower
   * @param targetIds - Array of target IDs to check
   * @param targetType - Type of targets (USER or COLLECTION)
   * @returns Map of targetId -> boolean indicating if followed
   *
   * Example:
   *   checkFollowingMultiple('did:plc:alice123', ['uuid-1', 'uuid-2', 'uuid-3'], FollowTargetType.COLLECTION)
   *   → Map{ 'uuid-1' => true, 'uuid-2' => false, 'uuid-3' => true }
   */
  checkFollowingMultiple(
    followerId: string,
    targetIds: string[],
    targetType: FollowTargetType,
  ): Promise<Result<Map<string, boolean>>>;
}
