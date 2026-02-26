import { Result, ok, err } from '../../../../shared/core/Result';
import { ICollectionRepository } from '../../domain/ICollectionRepository';
import { Collection } from '../../domain/Collection';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CardId } from '../../domain/value-objects/CardId';
import { CuratorId } from '../../domain/value-objects/CuratorId';

export class InMemoryCollectionRepository implements ICollectionRepository {
  private static instance: InMemoryCollectionRepository;
  private collections: Map<string, Collection> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryCollectionRepository {
    if (!InMemoryCollectionRepository.instance) {
      InMemoryCollectionRepository.instance =
        new InMemoryCollectionRepository();
    }
    return InMemoryCollectionRepository.instance;
  }

  private clone(collection: Collection): Collection {
    // Simple clone - in a real implementation you'd want proper deep cloning
    const collectionResult = Collection.create(
      {
        authorId: collection.authorId,
        name: collection.name.value,
        description: collection.description?.value,
        accessType: collection.accessType,
        collaboratorIds: collection.collaboratorIds,
        cardLinks: collection.cardLinks,
        cardCount: collection.cardCount,
        publishedRecordId: collection.publishedRecordId,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      },
      collection.id,
    );

    if (collectionResult.isErr()) {
      throw new Error(
        `Failed to clone collection: ${collectionResult.error.message}`,
      );
    }

    return collectionResult.value;
  }

  async findById(id: CollectionId): Promise<Result<Collection | null>> {
    try {
      const collection = this.collections.get(id.getStringValue());
      return ok(collection ? this.clone(collection) : null);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByIds(ids: CollectionId[]): Promise<Result<Collection[]>> {
    try {
      const collections: Collection[] = [];
      for (const id of ids) {
        const collection = this.collections.get(id.getStringValue());
        if (collection) {
          collections.push(this.clone(collection));
        }
      }
      return ok(collections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCuratorId(curatorId: CuratorId): Promise<Result<Collection[]>> {
    try {
      const collections = Array.from(this.collections.values()).filter(
        (collection) =>
          collection.authorId.value === curatorId.value ||
          collection.collaboratorIds.some((id) => id.value === curatorId.value),
      );
      return ok(collections.map((collection) => this.clone(collection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCardId(cardId: CardId): Promise<Result<Collection[]>> {
    try {
      const collections = Array.from(this.collections.values()).filter(
        (collection) =>
          collection.cardLinks.some(
            (link) => link.cardId.getStringValue() === cardId.getStringValue(),
          ),
      );
      return ok(collections.map((collection) => this.clone(collection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCuratorIdContainingCard(
    authorId: CuratorId,
    cardId: CardId,
  ): Promise<Result<Collection[]>> {
    try {
      const collections = Array.from(this.collections.values()).filter(
        (collection) =>
          collection.authorId.value === authorId.value &&
          collection.cardLinks.some(
            (link) => link.cardId.getStringValue() === cardId.getStringValue(),
          ),
      );
      return ok(collections.map((collection) => this.clone(collection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async findContainingCardAddedBy(
    cardId: CardId,
    addedBy: CuratorId,
  ): Promise<Result<Collection[]>> {
    try {
      const collections = Array.from(this.collections.values()).filter(
        (collection) =>
          collection.cardLinks.some(
            (link) =>
              link.cardId.getStringValue() === cardId.getStringValue() &&
              link.addedBy.value === addedBy.value,
          ),
      );
      return ok(collections.map((collection) => this.clone(collection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async save(collection: Collection): Promise<Result<void>> {
    try {
      this.collections.set(
        collection.collectionId.getStringValue(),
        this.clone(collection),
      );
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(collectionId: CollectionId): Promise<Result<void>> {
    try {
      this.collections.delete(collectionId.getStringValue());
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  // Helper methods for testing
  public clear(): void {
    this.collections.clear();
  }

  public getStoredCollection(id: CollectionId): Collection | undefined {
    return this.collections.get(id.getStringValue());
  }

  public getAllCollections(): Collection[] {
    return Array.from(this.collections.values()).map((collection) =>
      this.clone(collection),
    );
  }
}
