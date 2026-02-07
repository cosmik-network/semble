import { eq, inArray, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ICollectionRepository } from '../../domain/ICollectionRepository';
import { Collection } from '../../domain/Collection';
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
      const {
        collection: collectionData,
        collaborators,
        cardLinks,
        publishedRecord,
        linkPublishedRecords,
      } = CollectionMapper.toPersistence(collection);

      await this.db.transaction(async (tx) => {
        // Handle collection published record if it exists
        let publishedRecordId: string | undefined = undefined;

        if (publishedRecord) {
          const publishedRecordResult = await tx
            .insert(publishedRecords)
            .values({
              id: publishedRecord.id,
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
              recordedAt: publishedRecord.recordedAt || new Date(),
            })
            .onConflictDoNothing({
              target: [publishedRecords.uri, publishedRecords.cid],
            })
            .returning({ id: publishedRecords.id });

          if (publishedRecordResult.length === 0) {
            const existingRecord = await tx
              .select()
              .from(publishedRecords)
              .where(
                and(
                  eq(publishedRecords.uri, publishedRecord.uri),
                  eq(publishedRecords.cid, publishedRecord.cid),
                ),
              )
              .limit(1);

            if (existingRecord.length > 0) {
              publishedRecordId = existingRecord[0]!.id;
            }
          } else {
            publishedRecordId = publishedRecordResult[0]!.id;
          }
        }

        // Handle link published records
        const linkPublishedRecordMap = new Map<string, string>();
        if (linkPublishedRecords) {
          for (const linkRecord of linkPublishedRecords) {
            const linkPublishedRecordResult = await tx
              .insert(publishedRecords)
              .values({
                id: linkRecord.id,
                uri: linkRecord.uri,
                cid: linkRecord.cid,
                recordedAt: linkRecord.recordedAt || new Date(),
              })
              .onConflictDoNothing({
                target: [publishedRecords.uri, publishedRecords.cid],
              })
              .returning({ id: publishedRecords.id });

            let actualRecordId: string;
            if (linkPublishedRecordResult.length === 0) {
              const existingRecord = await tx
                .select()
                .from(publishedRecords)
                .where(
                  and(
                    eq(publishedRecords.uri, linkRecord.uri),
                    eq(publishedRecords.cid, linkRecord.cid),
                  ),
                )
                .limit(1);

              if (existingRecord.length > 0) {
                actualRecordId = existingRecord[0]!.id;
              } else {
                actualRecordId = linkRecord.id;
              }
            } else {
              actualRecordId = linkPublishedRecordResult[0]!.id;
            }

            linkPublishedRecordMap.set(linkRecord.id, actualRecordId);
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

        // Insert new card links with mapped published record IDs
        if (cardLinks.length > 0) {
          const cardLinksWithMappedRecords = cardLinks.map((link) => ({
            ...link,
            publishedRecordId: link.publishedRecordId
              ? linkPublishedRecordMap.get(link.publishedRecordId) ||
                link.publishedRecordId
              : undefined,
          }));

          await tx.insert(collectionCards).values(cardLinksWithMappedRecords);
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
}
