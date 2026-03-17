import { eq, inArray, and, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ICollectionRepository } from '../../domain/ICollectionRepository';
import {
  Collection,
  CollectionCommandType,
  CardLink,
} from '../../domain/Collection';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CardId } from '../../domain/value-objects/CardId';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import {
  collections,
  collectionCollaborators,
  collectionCards,
} from './schema/collection.sql';
import { publishedRecords } from './schema/publishedRecord.sql';
import { CollectionDTO, CollectionMapper } from './mappers/CollectionMapper';
import { Result, ok, err } from '../../../../shared/core/Result';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';

export class DrizzleCollectionRepository implements ICollectionRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findById(id: CollectionId): Promise<Result<Collection | null>> {
    try {
      const collectionId = id.getStringValue();

      // Get the collection
      const collectionResult = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(eq(collections.id, collectionId))
        .limit(1);

      if (collectionResult.length === 0) {
        return ok(null);
      }

      const result = collectionResult[0];
      if (!result || !result.collection) {
        return ok(null);
      }

      // Get collaborators
      const collaboratorResults = await this.db
        .select()
        .from(collectionCollaborators)
        .where(eq(collectionCollaborators.collectionId, collectionId));

      const collaborators = collaboratorResults.map((c) => c.collaboratorId);

      // Get card links
      const cardLinkResults = await this.db
        .select({
          cardLink: collectionCards,
          publishedRecord: publishedRecords,
        })
        .from(collectionCards)
        .leftJoin(
          publishedRecords,
          eq(collectionCards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(collectionCards.collectionId, collectionId));

      const cardLinks = cardLinkResults.map((link) => ({
        cardId: link.cardLink.cardId,
        addedBy: link.cardLink.addedBy,
        addedAt: link.cardLink.addedAt,
        publishedRecordId: link.publishedRecord?.id,
        publishedRecord: link.publishedRecord || undefined,
      }));

      const collectionDTO: CollectionDTO = {
        id: result.collection.id,
        authorId: result.collection.authorId,
        name: result.collection.name,
        description: result.collection.description || undefined,
        accessType: result.collection.accessType,
        cardCount: result.collection.cardCount,
        createdAt: result.collection.createdAt,
        updatedAt: result.collection.updatedAt,
        publishedRecordId: result.publishedRecord?.id || null,
        publishedRecord: result.publishedRecord || undefined,
        collaborators,
        cardLinks,
      };

      const domainResult = CollectionMapper.toDomain(collectionDTO);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByIds(ids: CollectionId[]): Promise<Result<Collection[]>> {
    try {
      if (ids.length === 0) {
        return ok([]);
      }

      const collectionIds = ids.map((id) => id.getStringValue());

      // Get all collections in one query
      const collectionResults = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(inArray(collections.id, collectionIds));

      if (collectionResults.length === 0) {
        return ok([]);
      }

      // Get all collaborators in one query
      const allCollaboratorResults = await this.db
        .select()
        .from(collectionCollaborators)
        .where(inArray(collectionCollaborators.collectionId, collectionIds));

      // Group collaborators by collection ID
      const collaboratorsByCollection = new Map<string, string[]>();
      allCollaboratorResults.forEach((c) => {
        if (!collaboratorsByCollection.has(c.collectionId)) {
          collaboratorsByCollection.set(c.collectionId, []);
        }
        collaboratorsByCollection.get(c.collectionId)!.push(c.collaboratorId);
      });

      // Get all card links in one query
      const allCardLinkResults = await this.db
        .select({
          cardLink: collectionCards,
          publishedRecord: publishedRecords,
        })
        .from(collectionCards)
        .leftJoin(
          publishedRecords,
          eq(collectionCards.publishedRecordId, publishedRecords.id),
        )
        .where(inArray(collectionCards.collectionId, collectionIds));

      // Group card links by collection ID
      const cardLinksByCollection = new Map<
        string,
        Array<{
          cardId: string;
          addedBy: string;
          addedAt: Date;
          publishedRecordId?: string;
          publishedRecord?: any;
        }>
      >();
      allCardLinkResults.forEach((link) => {
        if (!cardLinksByCollection.has(link.cardLink.collectionId)) {
          cardLinksByCollection.set(link.cardLink.collectionId, []);
        }
        cardLinksByCollection.get(link.cardLink.collectionId)!.push({
          cardId: link.cardLink.cardId,
          addedBy: link.cardLink.addedBy,
          addedAt: link.cardLink.addedAt,
          publishedRecordId: link.publishedRecord?.id,
          publishedRecord: link.publishedRecord || undefined,
        });
      });

      // Build domain collections
      const domainCollections: Collection[] = [];
      for (const result of collectionResults) {
        const collectionId = result.collection.id;
        const collaborators = collaboratorsByCollection.get(collectionId) || [];
        const cardLinks = cardLinksByCollection.get(collectionId) || [];

        const collectionDTO: CollectionDTO = {
          id: result.collection.id,
          authorId: result.collection.authorId,
          name: result.collection.name,
          description: result.collection.description || undefined,
          accessType: result.collection.accessType,
          cardCount: result.collection.cardCount,
          createdAt: result.collection.createdAt,
          updatedAt: result.collection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
          collaborators,
          cardLinks,
        };

        const domainResult = CollectionMapper.toDomain(collectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping collection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainCollections.push(domainResult.value);
      }

      return ok(domainCollections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCuratorId(curatorId: CuratorId): Promise<Result<Collection[]>> {
    try {
      const curatorIdString = curatorId.value;

      // Find collections where user is author or collaborator
      const authorCollections = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(eq(collections.authorId, curatorIdString));

      const collaboratorCollections = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCollaborators,
          eq(collections.id, collectionCollaborators.collectionId),
        )
        .where(eq(collectionCollaborators.collaboratorId, curatorIdString));

      // Combine and deduplicate
      const allCollectionResults = [
        ...authorCollections,
        ...collaboratorCollections,
      ];
      const uniqueCollections = allCollectionResults.filter(
        (collection, index, self) =>
          index ===
          self.findIndex((c) => c.collection.id === collection.collection.id),
      );

      const domainCollections: Collection[] = [];
      for (const result of uniqueCollections) {
        const collectionId = result.collection.id;

        // Get collaborators for this collection
        const collaboratorResults = await this.db
          .select()
          .from(collectionCollaborators)
          .where(eq(collectionCollaborators.collectionId, collectionId));

        const collaborators = collaboratorResults.map((c) => c.collaboratorId);

        // Get card links for this collection
        const cardLinkResults = await this.db
          .select({
            cardLink: collectionCards,
            publishedRecord: publishedRecords,
          })
          .from(collectionCards)
          .leftJoin(
            publishedRecords,
            eq(collectionCards.publishedRecordId, publishedRecords.id),
          )
          .where(eq(collectionCards.collectionId, collectionId));

        const cardLinks = cardLinkResults.map((link) => ({
          cardId: link.cardLink.cardId,
          addedBy: link.cardLink.addedBy,
          addedAt: link.cardLink.addedAt,
          publishedRecordId: link.publishedRecord?.id,
          publishedRecord: link.publishedRecord || undefined,
        }));

        const collectionDTO: CollectionDTO = {
          id: result.collection.id,
          authorId: result.collection.authorId,
          name: result.collection.name,
          description: result.collection.description || undefined,
          accessType: result.collection.accessType,
          cardCount: result.collection.cardCount,
          createdAt: result.collection.createdAt,
          updatedAt: result.collection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
          collaborators,
          cardLinks,
        };

        const domainResult = CollectionMapper.toDomain(collectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping collection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainCollections.push(domainResult.value);
      }

      return ok(domainCollections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCardId(cardId: CardId): Promise<Result<Collection[]>> {
    try {
      const cardIdString = cardId.getStringValue();

      // Find collections that contain this card
      const collectionResults = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(eq(collectionCards.cardId, cardIdString));

      const domainCollections: Collection[] = [];
      for (const result of collectionResults) {
        const collectionId = result.collection.id;

        // Get collaborators for this collection
        const collaboratorResults = await this.db
          .select()
          .from(collectionCollaborators)
          .where(eq(collectionCollaborators.collectionId, collectionId));

        const collaborators = collaboratorResults.map((c) => c.collaboratorId);

        // Get card links for this collection
        const cardLinkResults = await this.db
          .select({
            cardLink: collectionCards,
            publishedRecord: publishedRecords,
          })
          .from(collectionCards)
          .leftJoin(
            publishedRecords,
            eq(collectionCards.publishedRecordId, publishedRecords.id),
          )
          .where(eq(collectionCards.collectionId, collectionId));

        const cardLinks = cardLinkResults.map((link) => ({
          cardId: link.cardLink.cardId,
          addedBy: link.cardLink.addedBy,
          addedAt: link.cardLink.addedAt,
          publishedRecordId: link.publishedRecord?.id,
          publishedRecord: link.publishedRecord || undefined,
        }));

        const collectionDTO: CollectionDTO = {
          id: result.collection.id,
          authorId: result.collection.authorId,
          name: result.collection.name,
          description: result.collection.description || undefined,
          accessType: result.collection.accessType,
          cardCount: result.collection.cardCount,
          createdAt: result.collection.createdAt,
          updatedAt: result.collection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
          collaborators,
          cardLinks,
        };

        const domainResult = CollectionMapper.toDomain(collectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping collection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainCollections.push(domainResult.value);
      }

      return ok(domainCollections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCuratorIdContainingCard(
    authorId: CuratorId,
    cardId: CardId,
  ): Promise<Result<Collection[]>> {
    try {
      const authorIdString = authorId.value;
      const cardIdString = cardId.getStringValue();

      // Find collections authored by this curator that contain this card
      const collectionResults = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(
          and(
            eq(collections.authorId, authorIdString),
            eq(collectionCards.cardId, cardIdString),
          ),
        );

      const domainCollections: Collection[] = [];
      for (const result of collectionResults) {
        const collectionId = result.collection.id;

        // Get collaborators for this collection
        const collaboratorResults = await this.db
          .select()
          .from(collectionCollaborators)
          .where(eq(collectionCollaborators.collectionId, collectionId));

        const collaborators = collaboratorResults.map((c) => c.collaboratorId);

        // Get card links for this collection
        const cardLinkResults = await this.db
          .select({
            cardLink: collectionCards,
            publishedRecord: publishedRecords,
          })
          .from(collectionCards)
          .leftJoin(
            publishedRecords,
            eq(collectionCards.publishedRecordId, publishedRecords.id),
          )
          .where(eq(collectionCards.collectionId, collectionId));

        const cardLinks = cardLinkResults.map((link) => ({
          cardId: link.cardLink.cardId,
          addedBy: link.cardLink.addedBy,
          addedAt: link.cardLink.addedAt,
          publishedRecordId: link.publishedRecord?.id,
          publishedRecord: link.publishedRecord || undefined,
        }));

        const collectionDTO: CollectionDTO = {
          id: result.collection.id,
          authorId: result.collection.authorId,
          name: result.collection.name,
          description: result.collection.description || undefined,
          accessType: result.collection.accessType,
          cardCount: result.collection.cardCount,
          createdAt: result.collection.createdAt,
          updatedAt: result.collection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
          collaborators,
          cardLinks,
        };

        const domainResult = CollectionMapper.toDomain(collectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping collection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainCollections.push(domainResult.value);
      }

      return ok(domainCollections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findContainingCardAddedBy(
    cardId: CardId,
    addedBy: CuratorId,
  ): Promise<Result<Collection[]>> {
    try {
      const addedByString = addedBy.value;
      const cardIdString = cardId.getStringValue();

      // Find collections that contain this card where it was added by the specified curator
      const collectionResults = await this.db
        .select({
          collection: collections,
          publishedRecord: publishedRecords,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(
          and(
            eq(collectionCards.cardId, cardIdString),
            eq(collectionCards.addedBy, addedByString),
          ),
        );

      const domainCollections: Collection[] = [];
      for (const result of collectionResults) {
        const collectionId = result.collection.id;

        // Get collaborators for this collection
        const collaboratorResults = await this.db
          .select()
          .from(collectionCollaborators)
          .where(eq(collectionCollaborators.collectionId, collectionId));

        const collaborators = collaboratorResults.map((c) => c.collaboratorId);

        // Get card links for this collection
        const cardLinkResults = await this.db
          .select({
            cardLink: collectionCards,
            publishedRecord: publishedRecords,
          })
          .from(collectionCards)
          .leftJoin(
            publishedRecords,
            eq(collectionCards.publishedRecordId, publishedRecords.id),
          )
          .where(eq(collectionCards.collectionId, collectionId));

        const cardLinks = cardLinkResults.map((link) => ({
          cardId: link.cardLink.cardId,
          addedBy: link.cardLink.addedBy,
          addedAt: link.cardLink.addedAt,
          publishedRecordId: link.publishedRecord?.id,
          publishedRecord: link.publishedRecord || undefined,
        }));

        const collectionDTO: CollectionDTO = {
          id: result.collection.id,
          authorId: result.collection.authorId,
          name: result.collection.name,
          description: result.collection.description || undefined,
          accessType: result.collection.accessType,
          cardCount: result.collection.cardCount,
          createdAt: result.collection.createdAt,
          updatedAt: result.collection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
          collaborators,
          cardLinks,
        };

        const domainResult = CollectionMapper.toDomain(collectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping collection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainCollections.push(domainResult.value);
      }

      return ok(domainCollections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async save(collection: Collection): Promise<Result<void>> {
    try {
      const collectionId = collection.collectionId.getStringValue();
      const pendingCommands = collection.getPendingCommands();

      // save() is for updates only - use create() for new collections
      if (pendingCommands.length === 0) {
        return err(
          new Error(
            'save() called with no pending commands. Use create() for new collections or updateMetadata() for metadata-only updates.',
          ),
        );
      }

      // Process pending commands with optimized targeted operations
      await this.db.transaction(async (tx) => {
        // First, ensure the collection exists (upsert)
        const collectionData =
          CollectionMapper.toPersistence(collection).collection;

        // Handle collection published record if it exists
        let publishedRecordId: string | undefined;
        if (collection.publishedRecordId) {
          // Check if record already exists
          const existing = await tx
            .select({ id: publishedRecords.id })
            .from(publishedRecords)
            .where(
              and(
                eq(publishedRecords.uri, collection.publishedRecordId.uri),
                eq(publishedRecords.cid, collection.publishedRecordId.cid),
              ),
            )
            .limit(1);

          if (existing[0]) {
            publishedRecordId = existing[0].id;
          } else {
            const recordId = new UniqueEntityID().toString();
            await tx.insert(publishedRecords).values({
              id: recordId,
              uri: collection.publishedRecordId.uri,
              cid: collection.publishedRecordId.cid,
              recordedAt: new Date(),
            });
            publishedRecordId = recordId;
          }
        }

        // Upsert the collection
        await tx
          .insert(collections)
          .values({
            ...collectionData,
            publishedRecordId: publishedRecordId,
          })
          .onConflictDoUpdate({
            target: collections.id,
            set: {
              authorId: collectionData.authorId,
              name: collectionData.name,
              description: collectionData.description,
              accessType: collectionData.accessType,
              cardCount: collectionData.cardCount,
              updatedAt: collectionData.updatedAt,
              publishedRecordId: publishedRecordId,
            },
          });

        // Process each command
        for (const command of pendingCommands) {
          switch (command.type) {
            case CollectionCommandType.ADD_CARD: {
              const link = command.payload as CardLink;
              const cardLinkId = new UniqueEntityID().toString();

              // Handle published record if present
              let publishedRecordId: string | undefined;
              if (link.publishedRecordId) {
                // Check if record already exists
                const existing = await tx
                  .select({ id: publishedRecords.id })
                  .from(publishedRecords)
                  .where(
                    and(
                      eq(publishedRecords.uri, link.publishedRecordId.uri),
                      eq(publishedRecords.cid, link.publishedRecordId.cid),
                    ),
                  )
                  .limit(1);

                if (existing[0]) {
                  publishedRecordId = existing[0].id;
                } else {
                  const recordId = new UniqueEntityID().toString();
                  await tx.insert(publishedRecords).values({
                    id: recordId,
                    uri: link.publishedRecordId.uri,
                    cid: link.publishedRecordId.cid,
                    recordedAt: new Date(),
                  });
                  publishedRecordId = recordId;
                }
              }

              // Insert the new card link
              await tx
                .insert(collectionCards)
                .values({
                  id: cardLinkId,
                  collectionId: collectionId,
                  cardId: link.cardId.getStringValue(),
                  addedBy: link.addedBy.value,
                  addedAt: link.addedAt,
                  viaCardId: link.viaCardId?.getStringValue(),
                  publishedRecordId: publishedRecordId,
                })
                .onConflictDoNothing(); // Idempotent - ignore if already exists
              break;
            }

            case CollectionCommandType.UPDATE_CARD_LINK: {
              const { cardId, publishedRecordId } = command.payload;

              // Handle published record
              let recordId: string | undefined;
              if (publishedRecordId) {
                // Check if record already exists
                const existing = await tx
                  .select({ id: publishedRecords.id })
                  .from(publishedRecords)
                  .where(
                    and(
                      eq(publishedRecords.uri, publishedRecordId.uri),
                      eq(publishedRecords.cid, publishedRecordId.cid),
                    ),
                  )
                  .limit(1);

                if (existing[0]) {
                  recordId = existing[0].id;
                } else {
                  const newRecordId = new UniqueEntityID().toString();
                  await tx.insert(publishedRecords).values({
                    id: newRecordId,
                    uri: publishedRecordId.uri,
                    cid: publishedRecordId.cid,
                    recordedAt: new Date(),
                  });
                  recordId = newRecordId;
                }
              }

              // Update the card link
              await tx
                .update(collectionCards)
                .set({
                  publishedRecordId: recordId,
                })
                .where(
                  and(
                    eq(collectionCards.collectionId, collectionId),
                    eq(collectionCards.cardId, cardId.getStringValue()),
                  ),
                );
              break;
            }

            case CollectionCommandType.REMOVE_CARD: {
              const { cardId } = command.payload;

              // Delete the card link
              await tx
                .delete(collectionCards)
                .where(
                  and(
                    eq(collectionCards.collectionId, collectionId),
                    eq(collectionCards.cardId, cardId.getStringValue()),
                  ),
                );
              break;
            }

            case CollectionCommandType.ADD_COLLABORATOR:
            case CollectionCommandType.REMOVE_COLLABORATOR:
              // Handle collaborator changes if needed
              break;
          }
        }

        // Update collection metadata only (count and timestamp)
        // Other fields were already handled in the upsert above
        await tx
          .update(collections)
          .set({
            cardCount: collectionData.cardCount,
            updatedAt: collectionData.updatedAt,
          })
          .where(eq(collections.id, collectionId));
      });

      // Clear commands after successful save
      collection.clearPendingCommands();
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(collectionId: CollectionId): Promise<Result<void>> {
    try {
      const id = collectionId.getStringValue();

      // The foreign key constraints with ON DELETE CASCADE will automatically
      // delete related records in the collaborators and card links tables
      await this.db.delete(collections).where(eq(collections.id, id));

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async create(collection: Collection): Promise<Result<void>> {
    try {
      return await this.db.transaction(async (tx) => {
        const collectionData =
          CollectionMapper.toPersistence(collection).collection;

        // Handle published record if it exists
        let publishedRecordId: string | undefined;
        if (collection.publishedRecordId) {
          // Check if record already exists
          const existing = await tx
            .select({ id: publishedRecords.id })
            .from(publishedRecords)
            .where(
              and(
                eq(publishedRecords.uri, collection.publishedRecordId.uri),
                eq(publishedRecords.cid, collection.publishedRecordId.cid),
              ),
            )
            .limit(1);

          if (existing[0]) {
            publishedRecordId = existing[0].id;
          } else {
            const recordId = new UniqueEntityID().toString();
            await tx.insert(publishedRecords).values({
              id: recordId,
              uri: collection.publishedRecordId.uri,
              cid: collection.publishedRecordId.cid,
              recordedAt: new Date(),
            });
            publishedRecordId = recordId;
          }
        }

        // Insert the new collection
        await tx.insert(collections).values({
          ...collectionData,
          publishedRecordId: publishedRecordId,
        });

        return ok(undefined);
      });
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
      const id = collectionId.getStringValue();

      return await this.db.transaction(async (tx) => {
        // Build the update object with only provided fields
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (updates.name !== undefined) {
          updateData.name = updates.name;
        }
        if (updates.description !== undefined) {
          updateData.description = updates.description;
        }
        if (updates.accessType !== undefined) {
          updateData.accessType = updates.accessType;
        }

        // Handle published record if provided
        if (updates.publishedRecordId !== undefined) {
          // Check if record already exists
          const existing = await tx
            .select({ id: publishedRecords.id })
            .from(publishedRecords)
            .where(
              and(
                eq(publishedRecords.uri, updates.publishedRecordId.uri),
                eq(publishedRecords.cid, updates.publishedRecordId.cid),
              ),
            )
            .limit(1);

          let recordId: string;
          if (existing[0]) {
            recordId = existing[0].id;
          } else {
            const newRecordId = new UniqueEntityID().toString();
            await tx.insert(publishedRecords).values({
              id: newRecordId,
              uri: updates.publishedRecordId.uri,
              cid: updates.publishedRecordId.cid,
              recordedAt: new Date(),
            });
            recordId = newRecordId;
          }
          updateData.publishedRecordId = recordId;
        }

        await tx
          .update(collections)
          .set(updateData)
          .where(eq(collections.id, id));

        return ok(undefined);
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  // Batch operation to add a card to multiple collections efficiently
  async addCardToMultipleCollections(
    cardId: CardId,
    collectionIds: CollectionId[],
    curatorId: CuratorId,
    viaCardId?: CardId,
    publishedRecordIds?: Map<string, string>, // collectionId -> publishedRecordId
  ): Promise<Result<void>> {
    try {
      if (collectionIds.length === 0) {
        return ok(undefined);
      }

      const cardIdStr = cardId.getStringValue();
      const curatorIdStr = curatorId.value;
      const viaCardIdStr = viaCardId?.getStringValue();
      const addedAt = new Date();

      await this.db.transaction(async (tx) => {
        // Prepare batch of card links
        const cardLinksToInsert: any[] = [];
        const collectionIdsToUpdate: string[] = [];

        for (const collectionId of collectionIds) {
          const collectionIdStr = collectionId.getStringValue();
          const linkId = new UniqueEntityID().toString();
          const publishedRecordId = publishedRecordIds?.get(collectionIdStr);

          // Check if card already exists in collection
          const existing = await tx
            .select()
            .from(collectionCards)
            .where(
              and(
                eq(collectionCards.collectionId, collectionIdStr),
                eq(collectionCards.cardId, cardIdStr),
              ),
            )
            .limit(1);

          if (existing.length === 0) {
            cardLinksToInsert.push({
              id: linkId,
              collectionId: collectionIdStr,
              cardId: cardIdStr,
              addedBy: curatorIdStr,
              addedAt: addedAt,
              viaCardId: viaCardIdStr,
              publishedRecordId: publishedRecordId,
            });
            collectionIdsToUpdate.push(collectionIdStr);
          }
        }

        // Batch insert all card links at once
        if (cardLinksToInsert.length > 0) {
          await tx.insert(collectionCards).values(cardLinksToInsert);

          // Update all collection counts in a single query
          await tx.execute(sql`
            UPDATE collections
            SET
              card_count = (
                SELECT COUNT(*)
                FROM collection_cards
                WHERE collection_cards.collection_id = collections.id
              ),
              updated_at = NOW()
            WHERE id = ANY(${collectionIdsToUpdate}::uuid[])
          `);
        }
      });

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }
}
