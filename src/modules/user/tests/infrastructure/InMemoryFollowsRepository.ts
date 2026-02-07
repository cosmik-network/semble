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

  // Helper method for testing
  clear(): void {
    this.follows.clear();
  }
}
