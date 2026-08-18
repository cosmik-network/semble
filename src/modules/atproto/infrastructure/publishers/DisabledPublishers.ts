import { Result, err } from 'src/shared/core/Result';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { ICardPublisher } from 'src/modules/cards/application/ports/ICardPublisher';
import { ICollectionPublisher } from 'src/modules/cards/application/ports/ICollectionPublisher';
import { IConnectionPublisher } from 'src/modules/cards/application/ports/IConnectionPublisher';
import { IFollowPublisher } from 'src/modules/user/application/ports/IFollowPublisher';

/**
 * Publishers for processes that must never write to a user's PDS (e.g. the
 * firehose worker, which only mirrors records that already exist on the PDS).
 *
 * Publishing from such a process would authenticate as the user and race the
 * web tier's OAuth token refresh — historically the cause of destroyed OAuth
 * sessions. Any call here is a regression: it fails loudly instead.
 */
function disabled(operation: string): Result<never, UseCaseError> {
  const message =
    `Publishing is disabled in this process (attempted: ${operation}). ` +
    'This process must never authenticate as a user; this call indicates a ' +
    'code path that should have set skipPublishing.';
  console.error(`[DisabledPublishers] ${message}`);
  return err(new Error(message));
}

export class DisabledCardPublisher implements ICardPublisher {
  async publishCardToLibrary(): Promise<Result<never, UseCaseError>> {
    return disabled('publishCardToLibrary');
  }
  async unpublishCardFromLibrary(): Promise<Result<never, UseCaseError>> {
    return disabled('unpublishCardFromLibrary');
  }
}

export class DisabledCollectionPublisher implements ICollectionPublisher {
  async publish(): Promise<Result<never, UseCaseError>> {
    return disabled('publish (collection)');
  }
  async unpublish(): Promise<Result<never, UseCaseError>> {
    return disabled('unpublish (collection)');
  }
  async publishCardAddedToCollection(): Promise<Result<never, UseCaseError>> {
    return disabled('publishCardAddedToCollection');
  }
  async unpublishCardAddedToCollection(): Promise<Result<never, UseCaseError>> {
    return disabled('unpublishCardAddedToCollection');
  }
  async publishCollectionLinkRemoval(): Promise<Result<never, UseCaseError>> {
    return disabled('publishCollectionLinkRemoval');
  }
}

export class DisabledConnectionPublisher implements IConnectionPublisher {
  async publish(): Promise<Result<never, UseCaseError>> {
    return disabled('publish (connection)');
  }
  async unpublish(): Promise<Result<never, UseCaseError>> {
    return disabled('unpublish (connection)');
  }
}

export class DisabledFollowPublisher implements IFollowPublisher {
  async publishFollow(): Promise<Result<never, UseCaseError>> {
    return disabled('publishFollow');
  }
  async publishFollows(): Promise<Result<never, UseCaseError>> {
    return disabled('publishFollows');
  }
  async unpublishFollow(): Promise<Result<never, UseCaseError>> {
    return disabled('unpublishFollow');
  }
}
