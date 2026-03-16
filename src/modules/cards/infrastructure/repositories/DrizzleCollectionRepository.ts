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

      // If we have pending commands, use optimized targeted operations
      if (pendingCommands.length > 0) {
        await this.db.transaction(async (tx) => {
          // First, ensure the collection exists (upsert)
          const collectionData =
            CollectionMapper.toPersistence(collection).collection;

          // Handle collection published record if it exists
          let publishedRecordId: string | undefined;
          if (collection.publishedRecordId) {
            const recordId = new UniqueEntityID().toString();
            const recordedAt = new Date();
            const insertResult = await tx
              .insert(publishedRecords)
              .values({
                id: recordId,
                uri: collection.publishedRecordId.uri,
                cid: collection.publishedRecordId.cid,
                recordedAt: recordedAt,
              })
              .onConflictDoUpdate({
                target: [publishedRecords.uri, publishedRecords.cid],
                set: { recordedAt: recordedAt },
              })
              .returning({ id: publishedRecords.id });

            publishedRecordId = insertResult[0]?.id || recordId;
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

                // Handle published record if present - optimized version
                let publishedRecordId: string | undefined;
                if (link.publishedRecordId) {
                  const recordId = new UniqueEntityID().toString();
                  const recordedAt = new Date();
                  const insertResult = await tx
                    .insert(publishedRecords)
                    .values({
                      id: recordId,
                      uri: link.publishedRecordId.uri,
                      cid: link.publishedRecordId.cid,
                      recordedAt: recordedAt,
                    })
                    .onConflictDoUpdate({
                      target: [publishedRecords.uri, publishedRecords.cid],
                      set: { recordedAt: recordedAt }, // Update recordedAt to avoid empty set
                    })
                    .returning({ id: publishedRecords.id });

                  publishedRecordId = insertResult[0]?.id || recordId;
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

                // Handle published record - optimized version
                let recordId: string | undefined;
                if (publishedRecordId) {
                  const newRecordId = new UniqueEntityID().toString();
                  const recordedAt = new Date();
                  const insertResult = await tx
                    .insert(publishedRecords)
                    .values({
                      id: newRecordId,
                      uri: publishedRecordId.uri,
                      cid: publishedRecordId.cid,
                      recordedAt: recordedAt,
                    })
                    .onConflictDoUpdate({
                      target: [publishedRecords.uri, publishedRecords.cid],
                      set: { recordedAt: recordedAt }, // Update recordedAt to avoid empty set
                    })
                    .returning({ id: publishedRecords.id });

                  recordId = insertResult[0]?.id || newRecordId;
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
      }

      // Fall back to full save for collections without commands (e.g., initial creation)
      const {
        collection: collectionData,
        collaborators,
        cardLinks,
        publishedRecord,
        linkPublishedRecords,
      } = CollectionMapper.toPersistence(collection);

      await this.db.transaction(async (tx) => {
        // Handle collection published record if it exists - optimized
        let publishedRecordId: string | undefined = undefined;

        if (publishedRecord) {
          const recordedAt = publishedRecord.recordedAt || new Date();
          const publishedRecordResult = await tx
            .insert(publishedRecords)
            .values({
              id: publishedRecord.id,
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
              recordedAt: recordedAt,
            })
            .onConflictDoUpdate({
              target: [publishedRecords.uri, publishedRecords.cid],
              set: { recordedAt: recordedAt }, // Update recordedAt to avoid empty set
            })
            .returning({ id: publishedRecords.id });

          publishedRecordId =
            publishedRecordResult[0]?.id || publishedRecord.id;
        }

        // Batch insert published records if needed
        const publishedRecordsBatch: any[] = [];
        if (linkPublishedRecords && linkPublishedRecords.length > 0) {
          for (const record of linkPublishedRecords) {
            publishedRecordsBatch.push({
              id: record.id,
              uri: record.uri,
              cid: record.cid,
              recordedAt: record.recordedAt || new Date(),
            });
          }

          // Batch insert all published records at once
          if (publishedRecordsBatch.length > 0) {
            await tx
              .insert(publishedRecords)
              .values(publishedRecordsBatch)
              .onConflictDoNothing({
                target: [publishedRecords.uri, publishedRecords.cid],
              });
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

        // Only do full resync if this is an initial save or full update
        if (collection.getIsFullySynced()) {
          // Delete existing collaborators and card links
          await tx
            .delete(collectionCollaborators)
            .where(eq(collectionCollaborators.collectionId, collectionData.id));

          await tx
            .delete(collectionCards)
            .where(eq(collectionCards.collectionId, collectionData.id));

          // Insert new collaborators
          if (collaborators.length > 0) {
            await tx.insert(collectionCollaborators).values(collaborators);
          }

          // Insert new card links
          if (cardLinks.length > 0) {
            await tx.insert(collectionCards).values(cardLinks);
          }
        }
      });

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
