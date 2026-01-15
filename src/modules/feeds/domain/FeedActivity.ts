import { Entity } from '../../../shared/domain/Entity';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { Result, ok, err } from '../../../shared/core/Result';
import { ActivityId } from './value-objects/ActivityId';
import { ActivityType, ActivityTypeEnum } from './value-objects/ActivityType';
import { CuratorId } from '../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../cards/domain/value-objects/CollectionId';
import { UrlType } from '../../cards/domain/value-objects/UrlType';

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
  urlType?: UrlType; // Optional URL type from the card
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

  get urlType(): UrlType | undefined {
    return this.props.urlType;
  }

  // Type guards for metadata
  get cardCollected(): boolean {
    return this.props.type.value === ActivityTypeEnum.CARD_COLLECTED;
  }

  // Helper method to merge collections for deduplication
  public mergeCollections(newCollectionIds: CollectionId[]): void {
    if (!this.cardCollected) return;

    const metadata = this.props.metadata as CardCollectedMetadata;
    const existingIds = new Set(metadata.collectionIds || []);
    const newIds = newCollectionIds.map((id) => id.getStringValue());

    newIds.forEach((id) => existingIds.add(id));
    metadata.collectionIds = Array.from(existingIds);
  }

  private constructor(props: ActivityProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static createCardCollected(
    actorId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
    urlType?: UrlType,
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
      urlType,
      createdAt: createdAt || new Date(),
    };

    return ok(new FeedActivity(props, id));
  }
}
