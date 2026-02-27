import { ok, Result, err } from '../../../../shared/core/Result';
import { ValueObject } from '../../../../shared/domain/ValueObject';

export enum ConnectionTypeEnum {
  SUPPORTS = 'SUPPORTS',
  OPPOSES = 'OPPOSES',
  ADDRESSES = 'ADDRESSES',
  HELPFUL = 'HELPFUL',
  LEADS_TO = 'LEADS_TO',
  RELATED = 'RELATED',
  SUPPLEMENT = 'SUPPLEMENT',
  EXPLAINER = 'EXPLAINER',
}

// Metadata about each connection type
interface ConnectionTypeMetadata {
  isDirectional: boolean;
  displayName: string;
}

const CONNECTION_TYPE_METADATA: Record<
  ConnectionTypeEnum,
  ConnectionTypeMetadata
> = {
  [ConnectionTypeEnum.SUPPORTS]: {
    isDirectional: true,
    displayName: 'Supports',
  },
  [ConnectionTypeEnum.OPPOSES]: {
    isDirectional: true,
    displayName: 'Opposes',
  },
  [ConnectionTypeEnum.ADDRESSES]: {
    isDirectional: true,
    displayName: 'Addresses',
  },
  [ConnectionTypeEnum.HELPFUL]: {
    isDirectional: false,
    displayName: 'Helpful',
  },
  [ConnectionTypeEnum.LEADS_TO]: {
    isDirectional: true,
    displayName: 'Leads to',
  },
  [ConnectionTypeEnum.RELATED]: {
    isDirectional: false,
    displayName: 'Related',
  },
  [ConnectionTypeEnum.SUPPLEMENT]: {
    isDirectional: true,
    displayName: 'Supplement',
  },
  [ConnectionTypeEnum.EXPLAINER]: {
    isDirectional: true,
    displayName: 'Explainer',
  },
};

interface ConnectionTypeProps {
  value: ConnectionTypeEnum;
}

export class ConnectionType extends ValueObject<ConnectionTypeProps> {
  get value(): ConnectionTypeEnum {
    return this.props.value;
  }

  get isDirectional(): boolean {
    return CONNECTION_TYPE_METADATA[this.props.value].isDirectional;
  }

  get displayName(): string {
    return CONNECTION_TYPE_METADATA[this.props.value].displayName;
  }

  private constructor(props: ConnectionTypeProps) {
    super(props);
  }

  public static create(type: ConnectionTypeEnum): Result<ConnectionType> {
    if (!Object.values(ConnectionTypeEnum).includes(type)) {
      return err(new Error(`Invalid connection type: ${type}`));
    }
    return ok(new ConnectionType({ value: type }));
  }

  public static createFromString(type: string): Result<ConnectionType, Error> {
    const upperType = type.toUpperCase();
    if (!Object.values(ConnectionTypeEnum).includes(upperType as any)) {
      return err(new Error(`Invalid connection type: ${type}`));
    }
    return ok(new ConnectionType({ value: upperType as ConnectionTypeEnum }));
  }
}
