import { Result } from '../../../../shared/core/Result';

/**
 * A bundle emitted by CardActivityBundlingSaga representing one or more
 * card-added events (library + collection adds) for the same (cardId, actorId)
 * within the aggregation window.
 *
 * The saga is intentionally agnostic to recipients and notification policies.
 * Each registered handler decides which notifications (if any) to write.
 */
export interface CardActivityBundle {
  cardId: string;
  actorId: string;
  collectionIds: string[];
  hasLibraryEvent: boolean;
  hasCollectionEvents: boolean;
  bundledAt: Date;
}

export interface ICardActivityBundleHandler {
  handle(bundle: CardActivityBundle): Promise<Result<void>>;
}
