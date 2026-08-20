import { ValueObject } from 'src/shared/domain/ValueObject';
import { err, ok, Result } from 'src/shared/core/Result';

interface DIDProps {
  value: string;
}

export class DID extends ValueObject<DIDProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: DIDProps) {
    super(props);
  }

  public static create(did: string): Result<DID> {
    if (!did || (!did.startsWith('did:plc:') && !did.startsWith('did:web:'))) {
      return err(
        new Error(
          "Invalid DID format. Must start with 'did:plc:' or 'did:web:'",
        ),
      );
    }

    return ok(new DID({ value: did }));
  }

  public toString(): string {
    return this.props.value;
  }
}
