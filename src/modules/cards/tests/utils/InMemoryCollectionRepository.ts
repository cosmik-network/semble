import { Result, ok, err } from '../../../../shared/core/Result';
import { ICollectionRepository } from '../../domain/ICollectionRepository';
import { Collection } from '../../domain/Collection';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CardId } from '../../domain/value-objects/CardId';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';

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

  async create(collection: Collection): Promise<Result<void>> {
    try {
      const collectionId = collection.collectionId.getStringValue();
      if (this.collections.has(collectionId)) {
        return err(new Error('Collection already exists'));
      }
      this.collections.set(collectionId, this.clone(collection));
      return ok(undefined);
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

  async updateMetadata(
    collectionId: CollectionId,
    updates: {
      name?: string;
      description?: string;
      accessType?: string;
      publishedRecordId?: PublishedRecordId;
    },
  ): Promise<Result<void>> {
    try {
      const collection = this.collections.get(collectionId.getStringValue());
      if (!collection) {
        return err(new Error('Collection not found'));
      }

      // For in-memory implementation, we need to update the collection directly
      // This is a simplified implementation that updates the internal state
      if ('name' in updates || 'description' in updates) {
        const updateResult = collection.updateDetails(
          'name' in updates ? updates.name! : collection.name.value,
          'description' in updates
            ? updates.description
            : collection.description?.value,
        );
        if (updateResult.isErr()) {
          return err(updateResult.error);
        }
      }

      // Handle publishedRecordId update if provided
      if (updates.publishedRecordId !== undefined) {
        collection.markAsPublished(updates.publishedRecordId);
      }

      // Note: accessType updates would require domain methods
      // For testing purposes, this simplified implementation is sufficient

      this.collections.set(
        collectionId.getStringValue(),
        this.clone(collection),
      );
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async addCardToMultipleCollections(
    cardId: CardId,
    collectionIds: CollectionId[],
    curatorId: CuratorId,
    viaCardId?: CardId,
    publishedRecordIds?: Map<string, string>,
  ): Promise<Result<void>> {
    try {
      const addedAt = new Date();

      for (const collectionId of collectionIds) {
        const collection = this.collections.get(collectionId.getStringValue());
        if (collection) {
          // Check if card already exists in collection
          const existingLink = collection.cardLinks.find((link) =>
            link.cardId.equals(cardId),
          );

          if (!existingLink) {
            // Add the card to the collection
            const addResult = collection.addCard(
              cardId,
              curatorId,
              viaCardId,
              addedAt,
            );
            if (addResult.isErr()) {
              return err(addResult.error);
            }

            // Update the collection
            this.collections.set(
              collectionId.getStringValue(),
              this.clone(collection),
            );
          }
        }
      }

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
