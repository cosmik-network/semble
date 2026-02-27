import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Result, ok, err } from '../../../../shared/core/Result';

export class InvalidConnectionNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConnectionNoteError';
  }
}

interface ConnectionNoteProps {
  value: string;
}

export class ConnectionNote extends ValueObject<ConnectionNoteProps> {
  public static readonly MAX_LENGTH = 1000;

  get value(): string {
    return this.props.value;
  }

  private constructor(props: ConnectionNoteProps) {
    super(props);
  }

  public static create(
    note: string,
  ): Result<ConnectionNote, InvalidConnectionNoteError> {
    const trimmedNote = note.trim();

    if (trimmedNote.length === 0) {
      return err(
        new InvalidConnectionNoteError('Connection note cannot be empty'),
      );
    }

    if (trimmedNote.length > this.MAX_LENGTH) {
      return err(
        new InvalidConnectionNoteError(
          `Connection note cannot exceed ${this.MAX_LENGTH} characters`,
        ),
      );
    }

    return ok(new ConnectionNote({ value: trimmedNote }));
  }

  public toString(): string {
    return this.value;
  }
}
