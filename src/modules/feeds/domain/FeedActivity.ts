import { Entity } from '../../../shared/domain/Entity';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { Result, ok, err } from '../../../shared/core/Result';
import { ActivityId } from './value-objects/ActivityId';
import { ActivityType, ActivityTypeEnum } from './value-objects/ActivityType';
import { CuratorId } from '../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../cards/domain/value-objects/CollectionId';

export class ActivityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityValidationError';
  }
}

export interface CardCollectedMetadata {
  cardId: string;
  collectionIds?: string[];
}

export type ActivityMetadata = CardCollectedMetadata;

interface ActivityProps {
  actorId: CuratorId; // The user who performed the activity
  type: ActivityType; // The type of activity
  metadata: ActivityMetadata; // Additional metadata specific to the activity type
  createdAt: Date;
}

export class FeedActivity extends Entity<ActivityProps> {
  get activityId(): ActivityId {
    return ActivityId.create(this._id).unwrap();
  }

  get actorId(): CuratorId {
    return this.props.actorId;
  }

  get type(): ActivityType {
    return this.props.type;
  }

  get metadata(): ActivityMetadata {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // Type guards for metadata
  get cardCollected(): boolean {
    return (
      this.props.type.value === ActivityTypeEnum.CARD_ADDED_TO_LIBRARY ||
      this.props.type.value === ActivityTypeEnum.CARD_ADDED_TO_COLLECTION
    );
  }

  private constructor(props: ActivityProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static createCardCollected(
    actorId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
    createdAt?: Date,
    id?: UniqueEntityID,
  ): Result<FeedActivity, ActivityValidationError> {
    if (!cardId) {
      return err(new ActivityValidationError('Card ID is required'));
    }

    const typeResult = ActivityType.cardCollected();
    if (typeResult.isErr()) {
      return err(new ActivityValidationError(typeResult.error.message));
    }

    const metadata: CardCollectedMetadata = {
      cardId: cardId.getStringValue(),
      collectionIds: collectionIds?.map((id) => id.getStringValue()),
    };

    const props: ActivityProps = {
      actorId,
      type: typeResult.value,
      metadata,
      createdAt: createdAt || new Date(),
    };

    return ok(new FeedActivity(props, id));
  }
}
