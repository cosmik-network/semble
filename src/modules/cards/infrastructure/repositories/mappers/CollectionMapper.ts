import { UniqueEntityID } from '../../../../../shared/domain/UniqueEntityID';
import { Collection, CollectionAccessType } from '../../../domain/Collection';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CardId } from '../../../domain/value-objects/CardId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { PublishedRecordDTO, PublishedRecordRefDTO } from './DTOTypes';
import { CollectionQueryResultDTO } from '../../../domain/ICollectionQueryRepository';
import { err, ok, Result } from '../../../../../shared/core/Result';

// Database representation of a collection
export interface CollectionDTO extends PublishedRecordRefDTO {
  id: string;
  authorId: string;
  name: string;
  description?: string;
  accessType: string;
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
  collaborators?: string[];
  cardLinks?: {
    cardId: string;
    addedBy: string;
    addedAt: Date;
    publishedRecordId?: string;
    publishedRecord?: PublishedRecordDTO;
  }[];
}

export class CollectionMapper {
  public static toQueryResult(raw: {
    id: string;
    uri: string | null;
    name: string;
    description?: string | null;
    accessType: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    cardCount: number;
  }): CollectionQueryResultDTO {
    return {
      id: raw.id,
      uri: raw.uri || undefined,
      name: raw.name,
      description: raw.description || undefined,
      accessType: raw.accessType,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      authorId: raw.authorId,
      cardCount: raw.cardCount,
    };
  }

  public static toDomain(dto: CollectionDTO): Result<Collection> {
    try {
      // Create value objects
      const authorIdOrError = CuratorId.create(dto.authorId);
      if (authorIdOrError.isErr()) return err(authorIdOrError.error);

      // Create collaborator IDs
      const collaboratorIds: CuratorId[] = [];
      if (dto.collaborators) {
        for (const collaboratorId of dto.collaborators) {
          const curatorIdOrError = CuratorId.create(collaboratorId);
          if (curatorIdOrError.isErr()) return err(curatorIdOrError.error);
          collaboratorIds.push(curatorIdOrError.value);
        }
      }

      // Create card links
      const cardLinks: any[] = [];
      if (dto.cardLinks) {
        for (const linkDto of dto.cardLinks) {
          const cardIdOrError = CardId.createFromString(linkDto.cardId);
          if (cardIdOrError.isErr()) return err(cardIdOrError.error);

          const addedByOrError = CuratorId.create(linkDto.addedBy);
          if (addedByOrError.isErr()) return err(addedByOrError.error);

          let publishedRecordId: PublishedRecordId | undefined;
          if (linkDto.publishedRecord) {
            publishedRecordId = PublishedRecordId.create({
              uri: linkDto.publishedRecord.uri,
              cid: linkDto.publishedRecord.cid,
            });
          }

          cardLinks.push({
            cardId: cardIdOrError.value,
            addedBy: addedByOrError.value,
            addedAt: linkDto.addedAt,
            publishedRecordId,
          });
        }
      }

      // Create optional published record ID
      let publishedRecordId: PublishedRecordId | undefined;
      if (dto.publishedRecord) {
        publishedRecordId = PublishedRecordId.create({
          uri: dto.publishedRecord.uri,
          cid: dto.publishedRecord.cid,
        });
      }

      // Create the collection
      const collectionOrError = Collection.create(
        {
          authorId: authorIdOrError.value,
          name: dto.name,
          description: dto.description,
          accessType: dto.accessType as CollectionAccessType,
          collaboratorIds,
          cardLinks,
          cardCount: dto.cardCount,
          publishedRecordId,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
        },
        new UniqueEntityID(dto.id),
      );

      if (collectionOrError.isErr()) return err(collectionOrError.error);

      const collection = collectionOrError.value;

      return ok(collection);
    } catch (error) {
      return err(error as Error);
    }
  }

  public static toPersistence(collection: Collection): {
    collection: {
      id: string;
      authorId: string;
      name: string;
      description?: string;
      accessType: string;
      createdAt: Date;
      updatedAt: Date;
      cardCount: number;
      publishedRecordId?: string;
    };
    collaborators: {
      id: string;
      collectionId: string;
      collaboratorId: string;
    }[];
    cardLinks: {
      id: string;
      collectionId: string;
      cardId: string;
      addedBy: string;
      addedAt: Date;
      publishedRecordId?: string;
    }[];
    publishedRecord?: PublishedRecordDTO;
    linkPublishedRecords?: PublishedRecordDTO[];
  } {
    // Create published record data if it exists
    let publishedRecord: PublishedRecordDTO | undefined;
    let publishedRecordId: string | undefined;

    if (collection.publishedRecordId) {
      const recordId = new UniqueEntityID().toString();
      publishedRecord = {
        id: recordId,
        uri: collection.publishedRecordId.uri,
        cid: collection.publishedRecordId.cid,
        recordedAt: new Date(),
      };
      publishedRecordId = recordId;
    }

    // Create collaborators data
    const collaborators = collection.collaboratorIds.map((collaboratorId) => ({
      id: new UniqueEntityID().toString(),
      collectionId: collection.collectionId.getStringValue(),
      collaboratorId: collaboratorId.value,
    }));

    // Create card links data
    const linkPublishedRecords: PublishedRecordDTO[] = [];
    const cardLinks = collection.cardLinks.map((link) => {
      let linkPublishedRecordId: string | undefined;

      if (link.publishedRecordId) {
        const recordId = new UniqueEntityID().toString();
        linkPublishedRecords.push({
          id: recordId,
          uri: link.publishedRecordId.uri,
          cid: link.publishedRecordId.cid,
          recordedAt: new Date(),
        });
        linkPublishedRecordId = recordId;
      }

      return {
        id: new UniqueEntityID().toString(),
        collectionId: collection.collectionId.getStringValue(),
        cardId: link.cardId.getStringValue(),
        addedBy: link.addedBy.value,
        addedAt: link.addedAt,
        publishedRecordId: linkPublishedRecordId,
      };
    });

    return {
      collection: {
        id: collection.collectionId.getStringValue(),
        authorId: collection.authorId.value,
        name: collection.name.value,
        description: collection.description?.value,
        accessType: collection.accessType,
        cardCount: collection.cardCount,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        publishedRecordId,
      },
      collaborators,
      cardLinks,
      publishedRecord,
      linkPublishedRecords:
        linkPublishedRecords.length > 0 ? linkPublishedRecords : undefined,
    };
  }
}
