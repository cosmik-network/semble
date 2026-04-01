import { ValueObject } from '../../../shared/domain/ValueObject';
import { Result, ok, err } from '../../../shared/core/Result';
import { DID } from './DID';
import { ATUri } from './ATUri';

export class InvalidDIDOrATUriError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDIDOrATUriError';
  }
}

interface DIDOrATUriProps {
  value: string;
  isDID: boolean;
  did?: DID;
  atUri?: ATUri;
}

export class DIDOrATUri extends ValueObject<DIDOrATUriProps> {
  get value(): string {
    return this.props.value;
  }

  get isDID(): boolean {
    return this.props.isDID;
  }

  get isATUri(): boolean {
    return !this.props.isDID;
  }

  private constructor(props: DIDOrATUriProps) {
    super(props);
  }

  public static create(
    value: string,
  ): Result<DIDOrATUri, InvalidDIDOrATUriError> {
    if (!value || value.trim().length === 0) {
      return err(new InvalidDIDOrATUriError('Value cannot be empty'));
    }

    const trimmedValue = value.trim();

    // Check if it's an AT URI first (starts with "at://")
    if (trimmedValue.startsWith('at://')) {
      const atUriResult = ATUri.create(trimmedValue);
      if (atUriResult.isErr()) {
        return err(
          new InvalidDIDOrATUriError(
            `Invalid AT URI: ${atUriResult.error.message}`,
          ),
        );
      }

      return ok(
        new DIDOrATUri({
          value: trimmedValue,
          isDID: false,
          atUri: atUriResult.value,
        }),
      );
    }

    // Check if it's a DID (starts with "did:")
    if (trimmedValue.startsWith('did:')) {
      const didResult = DID.create(trimmedValue);
      if (didResult.isErr()) {
        return err(
          new InvalidDIDOrATUriError(`Invalid DID: ${didResult.error.message}`),
        );
      }

      return ok(
        new DIDOrATUri({
          value: trimmedValue,
          isDID: true,
          did: didResult.value,
        }),
      );
    }

    return err(
      new InvalidDIDOrATUriError(
        'Value must be either a DID (starting with "did:") or an AT URI (starting with "at://")',
      ),
    );
  }

  public getDID(): DID | undefined {
    return this.props.did;
  }

  public getATUri(): ATUri | undefined {
    return this.props.atUri;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other: DIDOrATUri): boolean {
    return (
      this.props.value === other.props.value &&
      this.props.isDID === other.props.isDID
    );
  }
}
