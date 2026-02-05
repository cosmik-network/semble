import { Result } from '../../../shared/core/Result';
import { Collection } from './Collection';
import { CollectionId } from './value-objects/CollectionId';
import { CardId } from './value-objects/CardId';
import { CuratorId } from './value-objects/CuratorId';

export interface ICollectionRepository {
  findById(id: CollectionId): Promise<Result<Collection | null>>;
  findByCuratorId(curatorId: CuratorId): Promise<Result<Collection[]>>;
  findByCardId(cardId: CardId): Promise<Result<Collection[]>>;
  findByCuratorIdContainingCard(
    authorId: CuratorId,
    cardId: CardId,
  ): Promise<Result<Collection[]>>;
  findContainingCardAddedBy(
    cardId: CardId,
    addedBy: CuratorId,
  ): Promise<Result<Collection[]>>;
  save(collection: Collection): Promise<Result<void>>;
  delete(collectionId: CollectionId): Promise<Result<void>>;
}
