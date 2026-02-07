import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import { IFollowsRepository } from '../../domain/repositories/IFollowsRepository';
import { Follow } from '../../domain/Follow';
import { DID } from '../../domain/value-objects/DID';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../domain/value-objects/FollowTargetType';
import { follows } from './schema/follows.sql';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { err, ok, Result } from 'src/shared/core/Result';

export class DrizzleFollowsRepository implements IFollowsRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getFollowers(
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<Follow[]>> {
    try {
      const results = await this.db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.targetId, targetId),
            eq(follows.targetType, targetType.value),
          ),
        );

      const followEntities: Follow[] = [];

      for (const row of results) {
        const followerDIDResult = DID.create(row.followerId);
        if (followerDIDResult.isErr()) {
          console.error(
            `Invalid follower DID: ${row.followerId}`,
            followerDIDResult.error,
          );
          continue;
        }

        const targetTypeResult = FollowTargetType.create(
          row.targetType as FollowTargetTypeEnum,
        );
        if (targetTypeResult.isErr()) {
          console.error(
            `Invalid target type: ${row.targetType}`,
            targetTypeResult.error,
          );
          continue;
        }

        const followResult = Follow.create(
          {
            followerId: followerDIDResult.value,
            targetId: row.targetId,
            targetType: targetTypeResult.value,
            createdAt: row.createdAt,
          },
          new UniqueEntityID(
            `${row.followerId}:${row.targetId}:${row.targetType}`,
          ),
        );

        if (followResult.isOk()) {
          followEntities.push(followResult.value);
        } else {
          console.error('Failed to create Follow entity:', followResult.error);
        }
      }

      return ok(followEntities);
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

      const results = await this.db
        .select()
        .from(follows)
        .where(
          and(
            sql`${follows.targetId} = ANY(${collectionIds}::text[])`,
            eq(follows.targetType, FollowTargetTypeEnum.COLLECTION),
          ),
        );

      const followEntities: Follow[] = [];

      for (const row of results) {
        const followerDIDResult = DID.create(row.followerId);
        if (followerDIDResult.isErr()) {
          console.error(
            `Invalid follower DID: ${row.followerId}`,
            followerDIDResult.error,
          );
          continue;
        }

        const targetTypeResult = FollowTargetType.create(
          row.targetType as FollowTargetTypeEnum,
        );
        if (targetTypeResult.isErr()) {
          console.error(
            `Invalid target type: ${row.targetType}`,
            targetTypeResult.error,
          );
          continue;
        }

        const followResult = Follow.create(
          {
            followerId: followerDIDResult.value,
            targetId: row.targetId,
            targetType: targetTypeResult.value,
            createdAt: row.createdAt,
          },
          new UniqueEntityID(
            `${row.followerId}:${row.targetId}:${row.targetType}`,
          ),
        );

        if (followResult.isOk()) {
          followEntities.push(followResult.value);
        } else {
          console.error('Failed to create Follow entity:', followResult.error);
        }
      }

      return ok(followEntities);
    } catch (error: any) {
      return err(error);
    }
  }
}
