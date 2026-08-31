import { extractTags, normalizeTag } from '@semble/types';
import {
  ITagQueryRepository,
  RecentTextDTO,
  TaggedCardResultDTO,
  TagQueryOptions,
} from '../../domain/ITagQueryRepository';
import { PaginatedQueryResult } from '../../domain/ICardQueryRepository';
import { ConnectionForUserDTO } from '../../domain/IConnectionQueryRepository';
import { CollectionQueryResultDTO } from '../../domain/ICollectionQueryRepository';
import { InMemoryCardRepository } from './InMemoryCardRepository';
import { InMemoryConnectionRepository } from './InMemoryConnectionRepository';
import { InMemoryCollectionRepository } from './InMemoryCollectionRepository';

function containsTag(text: string | undefined, tag: string): boolean {
  return !!text && extractTags(text).includes(tag);
}

function paginate<T>(
  items: T[],
  options: TagQueryOptions,
): PaginatedQueryResult<T> {
  const start = (options.page - 1) * options.limit;
  const page = items.slice(start, start + options.limit);
  return {
    items: page,
    totalCount: items.length,
    hasMore: start + page.length < items.length,
  };
}

export class InMemoryTagQueryRepository implements ITagQueryRepository {
  constructor(
    private cardRepository: InMemoryCardRepository,
    private connectionRepository: InMemoryConnectionRepository,
    private collectionRepository: InMemoryCollectionRepository,
  ) {}

  async getRecentTexts(options: {
    userDid?: string;
    limitPerSource: number;
  }): Promise<RecentTextDTO[]> {
    const { userDid, limitPerSource } = options;

    const notes = this.cardRepository
      .getAllCards()
      .filter((card) => card.isNoteCard)
      .filter((card) => !userDid || card.curatorId.value === userDid)
      .map((card) => ({
        text: card.content.noteContent?.text ?? '',
        createdAt: card.createdAt,
      }));

    const connectionNotes = this.connectionRepository
      .getAllConnections()
      .filter((connection) => !!connection.note)
      .filter(
        (connection) => !userDid || connection.curatorId.value === userDid,
      )
      .map((connection) => ({
        text: connection.note!.value,
        createdAt: connection.createdAt,
      }));

    const descriptions = this.collectionRepository
      .getAllCollections()
      .filter((collection) => !!collection.description)
      .filter((collection) => !userDid || collection.authorId.value === userDid)
      .map((collection) => ({
        text: collection.description!.value,
        createdAt: collection.createdAt,
      }));

    const bySource = [notes, connectionNotes, descriptions].map((source) =>
      source
        .filter((row) => row.text)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limitPerSource),
    );
    return bySource.flat();
  }

  async getTaggedCards(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<TaggedCardResultDTO>> {
    const normalized = normalizeTag(tag);
    const matches = this.cardRepository
      .getAllCards()
      .filter((card) => card.isNoteCard && card.parentCardId)
      .filter(
        (card) => !options.userDid || card.curatorId.value === options.userDid,
      )
      .filter((card) => containsTag(card.content.noteContent?.text, normalized))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((card) => ({
        parentCardId: card.parentCardId!.getStringValue(),
        noteCreatedAt: card.createdAt,
      }));
    return paginate(matches, options);
  }

  async getTaggedConnections(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<ConnectionForUserDTO>> {
    const normalized = normalizeTag(tag);
    const matches = this.connectionRepository
      .getAllConnections()
      .filter((connection) => connection.source.url && connection.target.url)
      .filter(
        (connection) =>
          !options.userDid || connection.curatorId.value === options.userDid,
      )
      .filter((connection) => containsTag(connection.note?.value, normalized))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        sourceUrl: connection.source.url!.value,
        sourceUrlMetadata:
          (connection as any).sourceUrlMetadata?.props ||
          (connection as any).sourceUrlMetadata ||
          undefined,
        targetUrl: connection.target.url!.value,
        targetUrlMetadata:
          (connection as any).targetUrlMetadata?.props ||
          (connection as any).targetUrlMetadata ||
          undefined,
      }));
    return paginate(matches, options);
  }

  async getTaggedCollections(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    const normalized = normalizeTag(tag);
    const matches = this.collectionRepository
      .getAllCollections()
      .filter(
        (collection) =>
          !options.userDid || collection.authorId.value === options.userDid,
      )
      .filter((collection) =>
        containsTag(collection.description?.value, normalized),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((collection) => ({
        id: collection.collectionId.getStringValue(),
        name: collection.name.value,
        description: collection.description?.value,
        accessType: collection.accessType,
        updatedAt: collection.updatedAt,
        createdAt: collection.createdAt,
        cardCount: collection.cardCount,
        authorId: collection.authorId.value,
      }));
    return paginate(matches, options);
  }
}
