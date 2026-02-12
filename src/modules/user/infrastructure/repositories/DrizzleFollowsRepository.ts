import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { IFollowsRepository } from '../../domain/repositories/IFollowsRepository';
import { Follow } from '../../domain/Follow';
import { DID } from '../../domain/value-objects/DID';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../domain/value-objects/FollowTargetType';
import { follows } from './schema/follows.sql';
import { publishedRecords } from '../../../cards/infrastructure/repositories/schema/publishedRecord.sql';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
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

  async save(follow: Follow): Promise<Result<void>> {
    try {
      // Handle publishedRecordId persistence (similar to Card repository)
      let publishedRecordIdUuid: string | undefined;
      if (follow.publishedRecordId) {
        const publishedRecordId = follow.publishedRecordId.getValue();

        // Insert or get existing published record
        const existingRecord = await this.db
          .select()
          .from(publishedRecords)
          .where(
            and(
              eq(publishedRecords.uri, publishedRecordId.uri),
              eq(publishedRecords.cid, publishedRecordId.cid),
            ),
          )
          .limit(1);

        if (existingRecord.length > 0) {
          publishedRecordIdUuid = existingRecord[0]!.id;
        } else {
          const insertResult = await this.db
            .insert(publishedRecords)
            .values({
              id: randomUUID(),
              uri: publishedRecordId.uri,
              cid: publishedRecordId.cid,
            })
            .returning({ id: publishedRecords.id });
          publishedRecordIdUuid = insertResult[0]!.id;
        }
      }

      await this.db
        .insert(follows)
        .values({
          followerId: follow.followerId.value,
          targetId: follow.targetId,
          targetType: follow.targetType.value,
          publishedRecordId: publishedRecordIdUuid,
          createdAt: follow.createdAt,
        })
        .onConflictDoUpdate({
          target: [follows.followerId, follows.targetId, follows.targetType],
          set: {
            publishedRecordId: publishedRecordIdUuid,
          },
        });

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(
    followerId: string,
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<void>> {
    try {
      await this.db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.targetId, targetId),
            eq(follows.targetType, targetType.value),
          ),
        );

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByFollowerAndTarget(
    followerId: string,
    targetId: string,
    targetType: FollowTargetType,
  ): Promise<Result<Follow | null>> {
    try {
      const results = await this.db
        .select({
          follow: follows,
          publishedRecord: publishedRecords,
        })
        .from(follows)
        .leftJoin(
          publishedRecords,
          eq(follows.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.targetId, targetId),
            eq(follows.targetType, targetType.value),
          ),
        )
        .limit(1);

      if (results.length === 0) {
        return ok(null);
      }

      const row = results[0]!;
      const followerDid = DID.create(row.follow.followerId);
      if (followerDid.isErr()) {
        return err(followerDid.error);
      }

      const targetTypeVO = FollowTargetType.create(
        row.follow.targetType as any,
      );
      if (targetTypeVO.isErr()) {
        return err(targetTypeVO.error);
      }

      // Reconstruct publishedRecordId if present
      let publishedRecordId: PublishedRecordId | undefined;
      if (row.publishedRecord) {
        publishedRecordId = PublishedRecordId.create({
          uri: row.publishedRecord.uri,
          cid: row.publishedRecord.cid,
        });
      }

      return Follow.create(
        {
          followerId: followerDid.value,
          targetId: row.follow.targetId,
          targetType: targetTypeVO.value,
          publishedRecordId,
          createdAt: row.follow.createdAt,
        },
        new UniqueEntityID(
          `${row.follow.followerId}:${row.follow.targetId}:${row.follow.targetType}`,
        ),
      );
    } catch (error) {
      return err(error as Error);
    }
  }
}
