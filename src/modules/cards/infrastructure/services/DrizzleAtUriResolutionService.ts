import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IAtUriResolutionService,
  AtUriResourceType,
  AtUriResolutionResult,
} from '../../domain/services/IAtUriResolutionService';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CardId } from '../../domain/value-objects/CardId';
import { ConnectionId } from '../../domain/value-objects/ConnectionId';
import {
  collections,
  collectionCards,
} from '../repositories/schema/collection.sql';
import { cards } from '../repositories/schema/card.sql';
import { connections } from '../repositories/schema/connection.sql';
import { publishedRecords } from '../repositories/schema/publishedRecord.sql';
import { follows } from '../../../user/infrastructure/repositories/schema/follows.sql';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { Result, ok, err } from 'src/shared/core/Result';

export class DrizzleAtUriResolutionService implements IAtUriResolutionService {
  constructor(private db: PostgresJsDatabase) {}

  async resolveAtUri(
    atUri: string,
  ): Promise<Result<AtUriResolutionResult | null>> {
    try {
      // Try collections first
      const collectionResult = await this.db
        .select({
          id: collections.id,
        })
        .from(collections)
        .innerJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (collectionResult.length > 0) {
        const collectionIdResult = CollectionId.createFromString(
          collectionResult[0]!.id,
        );
        if (collectionIdResult.isErr()) {
          return err(collectionIdResult.error);
        }

        return ok({
          type: AtUriResourceType.COLLECTION,
          id: collectionIdResult.value,
        });
      }

      // Try cards
      const cardResult = await this.db
        .select({
          id: cards.id,
        })
        .from(cards)
        .innerJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (cardResult.length > 0) {
        const cardIdResult = CardId.createFromString(cardResult[0]!.id);
        if (cardIdResult.isErr()) {
          return err(cardIdResult.error);
        }

        return ok({
          type: AtUriResourceType.CARD,
          id: cardIdResult.value,
        });
      }

      // Try collection links
      const linkResult = await this.db
        .select({
          collectionId: collectionCards.collectionId,
          cardId: collectionCards.cardId,
        })
        .from(collectionCards)
        .innerJoin(
          publishedRecords,
          eq(collectionCards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (linkResult.length > 0) {
        const collectionIdResult = CollectionId.createFromString(
          linkResult[0]!.collectionId,
        );
        const cardIdResult = CardId.createFromString(linkResult[0]!.cardId);

        if (collectionIdResult.isErr()) {
          return err(collectionIdResult.error);
        }
        if (cardIdResult.isErr()) {
          return err(cardIdResult.error);
        }

        return ok({
          type: AtUriResourceType.COLLECTION_LINK,
          id: {
            collectionId: collectionIdResult.value,
            cardId: cardIdResult.value,
          },
        });
      }

      return ok(null);
    } catch (error) {
      return err(error as Error);
    }
  }

  async resolveCardId(atUri: string): Promise<Result<CardId | null>> {
    try {
      const cardResult = await this.db
        .select({ id: cards.id })
        .from(cards)
        .innerJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (cardResult.length === 0) {
        return ok(null);
      }

      const cardIdResult = CardId.createFromString(cardResult[0]!.id);
      if (cardIdResult.isErr()) {
        return err(cardIdResult.error);
      }

      return ok(cardIdResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async resolveCollectionId(
    atUri: string,
  ): Promise<Result<CollectionId | null>> {
    const result = await this.resolveAtUri(atUri);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value || result.value.type !== AtUriResourceType.COLLECTION) {
      return ok(null);
    }

    return ok(result.value.id as CollectionId);
  }

  async resolveCollectionLinkId(
    atUri: string,
  ): Promise<Result<{ collectionId: CollectionId; cardId: CardId } | null>> {
    try {
      const linkResult = await this.db
        .select({
          collectionId: collectionCards.collectionId,
          cardId: collectionCards.cardId,
        })
        .from(collectionCards)
        .innerJoin(
          publishedRecords,
          eq(collectionCards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (linkResult.length === 0) {
        return ok(null);
      }

      const collectionIdResult = CollectionId.createFromString(
        linkResult[0]!.collectionId,
      );
      const cardIdResult = CardId.createFromString(linkResult[0]!.cardId);

      if (collectionIdResult.isErr()) {
        return err(collectionIdResult.error);
      }
      if (cardIdResult.isErr()) {
        return err(cardIdResult.error);
      }

      return ok({
        collectionId: collectionIdResult.value,
        cardId: cardIdResult.value,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  async resolveFollowId(atUri: string): Promise<
    Result<{
      followerDid: string;
      targetId: string;
      targetType: FollowTargetType;
    } | null>
  > {
    try {
      const followResult = await this.db
        .select({
          followerId: follows.followerId,
          targetId: follows.targetId,
          targetType: follows.targetType,
        })
        .from(follows)
        .innerJoin(
          publishedRecords,
          eq(follows.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (followResult.length === 0) {
        return ok(null);
      }

      const followData = followResult[0]!;

      // Create FollowTargetType value object
      const targetTypeResult = FollowTargetType.create(
        followData.targetType as any,
      );
      if (targetTypeResult.isErr()) {
        return err(targetTypeResult.error);
      }

      return ok({
        followerDid: followData.followerId,
        targetId: followData.targetId,
        targetType: targetTypeResult.value,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  async resolveConnectionId(
    atUri: string,
  ): Promise<Result<ConnectionId | null>> {
    try {
      const connectionResult = await this.db
        .select({ id: connections.id })
        .from(connections)
        .innerJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (connectionResult.length === 0) {
        return ok(null);
      }

      const connectionIdResult = ConnectionId.createFromString(
        connectionResult[0]!.id,
      );
      if (connectionIdResult.isErr()) {
        return err(connectionIdResult.error);
      }

      return ok(connectionIdResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }
}
