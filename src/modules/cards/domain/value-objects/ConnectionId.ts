import { ok, Result, err } from 'src/shared/core/Result';
import { Guard } from 'src/shared/core/Guard';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { ValueObject } from 'src/shared/domain/ValueObject';

interface ConnectionIdProps {
  value: UniqueEntityID;
}

export class ConnectionId extends ValueObject<ConnectionIdProps> {
  getStringValue(): string {
    return this.props.value.toString();
  }

  getValue(): UniqueEntityID {
    return this.props.value;
  }

  private constructor(value: UniqueEntityID) {
    super({ value });
  }

  public static create(id: UniqueEntityID): Result<ConnectionId> {
    const guardResult = Guard.againstNullOrUndefined(id, 'id');
    if (guardResult.isErr()) {
      return err(new Error(guardResult.error));
    }
    return ok(new ConnectionId(id));
  }

  public static createFromString(value: string): Result<ConnectionId> {
    const guardResult = Guard.againstNullOrUndefined(value, 'value');
    if (guardResult.isErr()) {
      return err(new Error(guardResult.error));
    }
    const uniqueEntityID = new UniqueEntityID(value);
    return ok(new ConnectionId(uniqueEntityID));
  }
}
