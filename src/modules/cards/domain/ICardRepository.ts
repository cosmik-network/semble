import { Result } from '../../../shared/core/Result';
import { Card } from './Card';
import { CardId } from './value-objects/CardId';
import { CuratorId } from './value-objects/CuratorId';
import { URL } from './value-objects/URL';

export interface ICardRepository {
  findById(id: CardId): Promise<Result<Card | null>>;
  save(card: Card): Promise<Result<void>>;
  delete(cardId: CardId): Promise<Result<void>>;
  findUsersUrlCardByUrl(
    url: URL,
    curatorId: CuratorId,
  ): Promise<Result<Card | null>>;
  findUsersNoteCardByUrl(
    url: URL,
    curatorId: CuratorId,
  ): Promise<Result<Card | null>>;

  // A user can annotate multiple passages on the same URL, so unlike the
  // note card lookup this returns all of their annotation cards
  findUsersAnnotationCardsByUrl(
    url: URL,
    curatorId: CuratorId,
  ): Promise<Result<Card[]>>;
}
