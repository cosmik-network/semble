import { ValueObject } from '../../../../shared/domain/ValueObject';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { Result, ok, err } from '../../../../shared/core/Result';

interface NotificationIdProps {
  value: UniqueEntityID;
}

export class NotificationId extends ValueObject<NotificationIdProps> {
  get value(): UniqueEntityID {
    return this.props.value;
  }

  private constructor(props: NotificationIdProps) {
    super(props);
  }

  public static create(id?: UniqueEntityID): Result<NotificationId> {
    return ok(new NotificationId({ value: id || new UniqueEntityID() }));
  }

  public static createFromString(id: string): Result<NotificationId> {
    return ok(new NotificationId({ value: new UniqueEntityID(id) }));
  }

  public getStringValue(): string {
    return this.props.value.toString();
  }

  public getValue(): UniqueEntityID {
    return this.props.value;
  }
}
