import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { ok, err, Result } from '../../../shared/core/Result';
import { NotificationId } from './value-objects/NotificationId';
import { NotificationType } from './value-objects/NotificationType';
import { CuratorId } from '../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../cards/domain/value-objects/CollectionId';

export interface NotificationMetadata {
  cardId: string;
  collectionIds?: string[];
}

export interface FollowNotificationMetadata {
  targetType: 'USER' | 'COLLECTION';
  targetId?: string; // Collection ID if applicable
}

interface NotificationProps {
  recipientUserId: CuratorId;
  actorUserId: CuratorId;
  type: NotificationType;
  metadata: NotificationMetadata;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Notification extends AggregateRoot<NotificationProps> {
  get notificationId(): NotificationId {
    return NotificationId.create(this._id).unwrap();
  }

  get recipientUserId(): CuratorId {
    return this.props.recipientUserId;
  }

  get actorUserId(): CuratorId {
    return this.props.actorUserId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get metadata(): NotificationMetadata {
    return this.props.metadata;
  }

  get read(): boolean {
    return this.props.read;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private constructor(props: NotificationProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(
    props: Omit<NotificationProps, 'createdAt' | 'updatedAt' | 'read'> & {
      read?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: UniqueEntityID,
  ): Result<Notification> {
    const now = new Date();
    const notificationProps: NotificationProps = {
      ...props,
      read: props.read ?? false,
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    };

    const notification = new Notification(notificationProps, id);
    return ok(notification);
  }

  public static createUserAddedYourCard(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Result<Notification> {
    const typeResult = NotificationType.userAddedYourCard();
    if (typeResult.isErr()) {
      return err(typeResult.error);
    }

    const metadata: NotificationMetadata = {
      cardId: cardId.getStringValue(),
      collectionIds: collectionIds?.map((id) => id.getStringValue()),
    };

    return this.create({
      recipientUserId,
      actorUserId,
      type: typeResult.value,
      metadata,
    });
  }

  public static createUserAddedToYourCollection(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionId: CollectionId,
  ): Result<Notification> {
    const typeResult = NotificationType.userAddedToYourCollection();
    if (typeResult.isErr()) {
      return err(typeResult.error);
    }

    const metadata: NotificationMetadata = {
      cardId: cardId.getStringValue(),
      collectionIds: [collectionId.getStringValue()],
    };

    return this.create({
      recipientUserId,
      actorUserId,
      type: typeResult.value,
      metadata,
    });
  }

  public static createUserFollowedYou(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
  ): Result<Notification> {
    const typeResult = NotificationType.userFollowedYou();
    if (typeResult.isErr()) {
      return err(typeResult.error);
    }

    const metadata: FollowNotificationMetadata = {
      targetType: 'USER',
    };

    return this.create({
      recipientUserId,
      actorUserId,
      type: typeResult.value,
      metadata: metadata as any,
    });
  }

  public static createUserFollowedYourCollection(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    collectionId: CollectionId,
  ): Result<Notification> {
    const typeResult = NotificationType.userFollowedYourCollection();
    if (typeResult.isErr()) {
      return err(typeResult.error);
    }

    const metadata: FollowNotificationMetadata = {
      targetType: 'COLLECTION',
      targetId: collectionId.getStringValue(),
    };

    return this.create({
      recipientUserId,
      actorUserId,
      type: typeResult.value,
      metadata: metadata as any,
    });
  }

  public static createUserAddedYourBskyPost(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Result<Notification> {
    const typeResult = NotificationType.userAddedYourBskyPost();
    if (typeResult.isErr()) {
      return err(typeResult.error);
    }

    const metadata: NotificationMetadata = {
      cardId: cardId.getStringValue(),
      collectionIds: collectionIds?.map((id) => id.getStringValue()),
    };

    return this.create({
      recipientUserId,
      actorUserId,
      type: typeResult.value,
      metadata,
    });
  }

  public static createUserAddedYourCollection(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Result<Notification> {
    const typeResult = NotificationType.userAddedYourCollection();
    if (typeResult.isErr()) {
      return err(typeResult.error);
    }

    const metadata: NotificationMetadata = {
      cardId: cardId.getStringValue(),
      collectionIds: collectionIds?.map((id) => id.getStringValue()),
    };

    return this.create({
      recipientUserId,
      actorUserId,
      type: typeResult.value,
      metadata,
    });
  }

  public markAsRead(): void {
    this.props.read = true;
    this.props.updatedAt = new Date();
  }

  public markAsUnread(): void {
    this.props.read = false;
    this.props.updatedAt = new Date();
  }
}
