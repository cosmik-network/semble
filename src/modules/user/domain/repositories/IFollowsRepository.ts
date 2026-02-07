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
}
