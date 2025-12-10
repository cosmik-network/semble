import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Result, ok, err } from '../../../../shared/core/Result';

export enum NotificationTypeEnum {
  USER_ADDED_YOUR_CARD = 'USER_ADDED_YOUR_CARD',
  USER_ADDED_YOUR_BSKY_POST = 'USER_ADDED_YOUR_BSKY_POST',
  USER_ADDED_YOUR_COLLECTION = 'USER_ADDED_YOUR_COLLECTION',
}

interface NotificationTypeProps {
  value: NotificationTypeEnum;
}

export class NotificationType extends ValueObject<NotificationTypeProps> {
  get value(): NotificationTypeEnum {
    return this.props.value;
  }

  private constructor(props: NotificationTypeProps) {
    super(props);
  }

  public static create(type: NotificationTypeEnum): Result<NotificationType> {
    if (!Object.values(NotificationTypeEnum).includes(type)) {
      return err(new Error(`Invalid notification type: ${type}`));
    }
    return ok(new NotificationType({ value: type }));
  }

  public static userAddedYourCard(): Result<NotificationType> {
    return this.create(NotificationTypeEnum.USER_ADDED_YOUR_CARD);
  }

  public static userAddedYourBskyPost(): Result<NotificationType> {
    return this.create(NotificationTypeEnum.USER_ADDED_YOUR_BSKY_POST);
  }

  public static userAddedYourCollection(): Result<NotificationType> {
    return this.create(NotificationTypeEnum.USER_ADDED_YOUR_COLLECTION);
  }
}
