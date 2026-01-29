import { UniqueEntityID } from '../../../../../shared/domain/UniqueEntityID';
import {
  FeedActivity,
  ActivityMetadata,
  CardCollectedMetadata,
} from '../../../domain/FeedActivity';
import {
  ActivityType,
  ActivityTypeEnum,
} from '../../../domain/value-objects/ActivityType';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';
import { err, ok, Result } from '../../../../../shared/core/Result';

// Database representation of a feed activity
export interface FeedActivityDTO {
  id: string;
  actorId: string;
  cardId?: string;
  type: string;
  metadata: ActivityMetadata;
  urlType?: string;
  source?: string;
  createdAt: Date;
}

export class FeedActivityMapper {
  public static toDomain(dto: FeedActivityDTO): Result<FeedActivity> {
    try {
      const actorIdResult = CuratorId.create(dto.actorId);
      if (actorIdResult.isErr()) return err(actorIdResult.error);

      const activityTypeResult = ActivityType.create(
        dto.type as ActivityTypeEnum,
      );
      if (activityTypeResult.isErr()) return err(activityTypeResult.error);

      // For now, we only support CARD_COLLECTED activities
      if (dto.type === ActivityTypeEnum.CARD_COLLECTED) {
        const metadata = dto.metadata as CardCollectedMetadata;
        const cardIdResult = CardId.createFromString(metadata.cardId);
        if (cardIdResult.isErr()) return err(cardIdResult.error);

        let collectionIds: CollectionId[] | undefined;
        if (metadata.collectionIds) {
          const collectionIdResults = metadata.collectionIds.map((id) =>
            CollectionId.createFromString(id),
          );

          // Check if any collection ID creation failed
          for (const result of collectionIdResults) {
            if (result.isErr()) return err(result.error);
          }

          collectionIds = collectionIdResults.map((result) => result.unwrap());
        }

        let urlType: UrlType | undefined;
        if (dto.urlType) {
          urlType = dto.urlType as UrlType;
        }

        const activityResult = FeedActivity.createCardCollected(
          actorIdResult.value,
          cardIdResult.value,
          collectionIds,
          urlType,
          dto.source,
          dto.createdAt,
          new UniqueEntityID(dto.id),
        );

        if (activityResult.isErr()) return err(activityResult.error);

        return ok(activityResult.value);
      }

      return err(new Error(`Unsupported activity type: ${dto.type}`));
    } catch (error) {
      return err(error as Error);
    }
  }

  public static toPersistence(activity: FeedActivity): FeedActivityDTO {
    let cardId: string | undefined;

    // Extract cardId for CARD_COLLECTED activities
    if (activity.cardCollected) {
      const metadata = activity.metadata as CardCollectedMetadata;
      cardId = metadata.cardId;
    }

    return {
      id: activity.activityId.getStringValue(),
      actorId: activity.actorId.value,
      cardId,
      type: activity.type.value,
      metadata: activity.metadata,
      urlType: activity.urlType,
      source: activity.source,
      createdAt: activity.createdAt,
    };
  }
}
