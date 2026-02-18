import { Result, ok, err } from 'src/shared/core/Result';
import { Follow } from '../../domain/Follow';
import { IFollowsRepository } from '../../domain/repositories/IFollowsRepository';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../domain/value-objects/FollowTargetType';

export class InMemoryFollowsRepository implements IFollowsRepository {
  private static instance: InMemoryFollowsRepository;
  private follows: Map<string, Follow> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryFollowsRepository {
    if (!InMemoryFollowsRepository.instance) {
      InMemoryFollowsRepository.instance = new InMemoryFollowsRepository();
    }
    return InMemoryFollowsRepository.instance;
  }

  async getFollowers(
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<Follow[]>> {
    try {
      const followers: Follow[] = [];

      for (const follow of this.follows.values()) {
        if (
          follow.targetId === targetId &&
          follow.targetType.equals(targetType)
        ) {
          followers.push(follow);
        }
      }

      return ok(followers);
    } catch (error: any) {
      return err(error);
    }
  }

  async getFollowersOfCollections(
    collectionIds: string[],
  ): Promise<Result<Follow[]>> {
    try {
      if (collectionIds.length === 0) {
        return ok([]);
      }

      const followers: Follow[] = [];

      for (const follow of this.follows.values()) {
        if (
          collectionIds.includes(follow.targetId) &&
          follow.targetType.value === FollowTargetTypeEnum.COLLECTION
        ) {
          followers.push(follow);
        }
      }

      return ok(followers);
    } catch (error: any) {
      return err(error);
    }
  }

  // Helper method for testing
  async save(follow: Follow): Promise<Result<void>> {
    try {
      const key = `${follow.followerId.value}:${follow.targetId}:${follow.targetType.value}`;
      this.follows.set(key, follow);
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async delete(
    followerId: string,
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<void>> {
    try {
      const key = `${followerId}:${targetId}:${targetType.value}`;
      this.follows.delete(key);
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async findByFollowerAndTarget(
    followerId: string,
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<Follow | null>> {
    try {
      const key = `${followerId}:${targetId}:${targetType.value}`;
      const follow = this.follows.get(key);
      return ok(follow || null);
    } catch (error: any) {
      return err(error);
    }
  }

  async getFollowing(
    followerId: string,
    targetType: FollowTargetType,
    options: { page: number; limit: number },
  ): Promise<Result<{ follows: Follow[]; totalCount: number }>> {
    try {
      const allFollows: Follow[] = [];

      for (const follow of this.follows.values()) {
        if (
          follow.followerId.value === followerId &&
          follow.targetType.equals(targetType)
        ) {
          allFollows.push(follow);
        }
      }

      // Sort by creation date descending (most recent first)
      allFollows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalCount = allFollows.length;
      const offset = (options.page - 1) * options.limit;
      const follows = allFollows.slice(offset, offset + options.limit);

      return ok({ follows, totalCount });
    } catch (error: any) {
      return err(error);
    }
  }

  async getFollowingCount(
    followerId: string,
    targetType?: FollowTargetType,
  ): Promise<Result<number>> {
    try {
      let count = 0;

      for (const follow of this.follows.values()) {
        if (follow.followerId.value === followerId) {
          if (!targetType || follow.targetType.equals(targetType)) {
            count++;
          }
        }
      }

      return ok(count);
    } catch (error: any) {
      return err(error);
    }
  }

  async getFollowersCount(
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<number>> {
    try {
      let count = 0;

      for (const follow of this.follows.values()) {
        if (
          follow.targetId === targetId &&
          follow.targetType.equals(targetType)
        ) {
          count++;
        }
      }

      return ok(count);
    } catch (error: any) {
      return err(error);
    }
  }

  // Helper method for testing
  clear(): void {
    this.follows.clear();
  }
}
