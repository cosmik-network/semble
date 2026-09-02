import { ok, err, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  normalizeTag,
  PaginationDTO,
  TaggedItemType,
  User,
  UrlMetadata,
} from '@semble/types';
import {
  ITagQueryRepository,
  TaggedCardResultDTO,
} from '../../../domain/ITagQueryRepository';
import {
  ICardQueryRepository,
  UrlCardView,
} from '../../../domain/ICardQueryRepository';
import { ConnectionForUserDTO } from '../../../domain/IConnectionQueryRepository';
import { CollectionQueryResultDTO } from '../../../domain/ICollectionQueryRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { IIdentityResolutionService } from '../../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../../atproto/domain/DIDOrHandle';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { CollectionAccessType } from '../../../domain/Collection';

export interface GetTaggedItemsQuery {
  tag: string;
  /** Absent → blended list across all three types. */
  itemType?: TaggedItemType;
  user?: string; // DID or handle
  callingUserId?: string;
  page?: number;
  limit?: number;
}

export type TaggedCardDTO = Omit<UrlCardView, 'authorId'> & { author: User };

export interface TaggedConnectionDTO {
  connection: {
    id: string;
    type?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    curator: User;
  };
  source: TaggedConnectionUrlDTO;
  target: TaggedConnectionUrlDTO;
}

interface TaggedConnectionUrlDTO {
  url: string;
  metadata: UrlMetadata;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
  urlConnectionCount?: number;
  urlIsConnected?: boolean;
}

export interface TaggedCollectionDTO {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  accessType: CollectionAccessType;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export type TaggedItemDTO =
  | { type: 'card'; card: TaggedCardDTO }
  | { type: 'connection'; connection: TaggedConnectionDTO }
  | { type: 'collection'; collection: TaggedCollectionDTO };

export interface GetTaggedItemsResult {
  tag: string;
  /** Present when the request was filtered to a single type. */
  itemType?: TaggedItemType;
  /** Blended reverse-chron list; present when no itemType filter was given. */
  items?: TaggedItemDTO[];
  cards?: TaggedCardDTO[];
  connections?: TaggedConnectionDTO[];
  collections?: TaggedCollectionDTO[];
  pagination: PaginationDTO;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetTaggedItemsUseCase implements UseCase<
  GetTaggedItemsQuery,
  Result<GetTaggedItemsResult>
> {
  constructor(
    private tagQueryRepo: ITagQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
    private identityResolver: IIdentityResolutionService,
  ) {}

  async execute(
    query: GetTaggedItemsQuery,
  ): Promise<Result<GetTaggedItemsResult>> {
    const tag = normalizeTag(query.tag);
    if (!tag) {
      return err(new ValidationError('Tag is required'));
    }
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    // Resolve optional user filter to a DID
    let userDid: string | undefined;
    if (query.user) {
      const identifierResult = DIDOrHandle.create(query.user);
      if (identifierResult.isErr()) {
        return err(new ValidationError('Invalid user identifier'));
      }
      const didResult = await this.identityResolver.resolveToDID(
        identifierResult.value,
      );
      if (didResult.isErr()) {
        return err(
          new ValidationError(
            `Could not resolve user identifier: ${didResult.error.message}`,
          ),
        );
      }
      userDid = didResult.value.value;
    }

    const paginate = (totalCount: number): PaginationDTO => ({
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasMore: page * limit < totalCount,
      limit,
    });

    try {
      const enricher = new ProfileEnricher(this.profileService);

      if (!query.itemType) {
        return await this.executeBlended(
          tag,
          { page, limit, userDid },
          query.callingUserId,
          enricher,
          paginate,
        );
      }

      const options = { page, limit, userDid };

      if (query.itemType === 'card') {
        const result = await this.tagQueryRepo.getTaggedCards(tag, options);
        const cardMapResult = await this.hydrateCards(
          result.items,
          query.callingUserId,
          enricher,
        );
        if (cardMapResult.isErr()) {
          return err(cardMapResult.error);
        }
        const cards = result.items
          .map((item) => cardMapResult.value.get(item.parentCardId))
          .filter((card): card is TaggedCardDTO => !!card);

        return ok({
          tag,
          itemType: query.itemType,
          cards,
          pagination: paginate(result.totalCount),
        });
      }

      if (query.itemType === 'connection') {
        const result = await this.tagQueryRepo.getTaggedConnections(
          tag,
          options,
        );
        const connMapResult = await this.hydrateConnections(
          result.items,
          query.callingUserId,
          enricher,
        );
        if (connMapResult.isErr()) {
          return err(connMapResult.error);
        }
        const connections = result.items
          .map((item) => connMapResult.value.get(item.connection.id))
          .filter((conn): conn is TaggedConnectionDTO => !!conn);

        return ok({
          tag,
          itemType: query.itemType,
          connections,
          pagination: paginate(result.totalCount),
        });
      }

      // collections
      const result = await this.tagQueryRepo.getTaggedCollections(tag, options);
      const collMapResult = await this.hydrateCollections(
        result.items,
        query.callingUserId,
        enricher,
      );
      if (collMapResult.isErr()) {
        return err(collMapResult.error);
      }
      const collections = result.items
        .map((item) => collMapResult.value.get(item.id))
        .filter((coll): coll is TaggedCollectionDTO => !!coll);

      return ok({
        tag,
        itemType: query.itemType,
        collections,
        pagination: paginate(result.totalCount),
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to get tagged items: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Blended reverse-chron page across all three types. Offset pagination over
   * merged streams: fetch the first page*limit rows of each type, merge-sort
   * by timestamp, and slice the requested window. Cost grows with page depth,
   * which is acceptable — the underlying regex scans dominate regardless.
   */
  private async executeBlended(
    tag: string,
    options: { page: number; limit: number; userDid?: string },
    callingUserId: string | undefined,
    enricher: ProfileEnricher,
    paginate: (totalCount: number) => PaginationDTO,
  ): Promise<Result<GetTaggedItemsResult>> {
    const { page, limit, userDid } = options;
    const window = { page: 1, limit: page * limit, userDid };

    const [cardsResult, connectionsResult, collectionsResult] =
      await Promise.all([
        this.tagQueryRepo.getTaggedCards(tag, window),
        this.tagQueryRepo.getTaggedConnections(tag, window),
        this.tagQueryRepo.getTaggedCollections(tag, window),
      ]);

    type Ref =
      | { type: 'card'; key: string; createdAt: Date }
      | { type: 'connection'; key: string; createdAt: Date }
      | { type: 'collection'; key: string; createdAt: Date };

    const refs: Ref[] = [
      ...cardsResult.items.map((item) => ({
        type: 'card' as const,
        key: item.parentCardId,
        createdAt: item.noteCreatedAt,
      })),
      ...connectionsResult.items.map((item) => ({
        type: 'connection' as const,
        key: item.connection.id,
        createdAt: item.connection.createdAt,
      })),
      ...collectionsResult.items.map((item) => ({
        type: 'collection' as const,
        key: item.id,
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const offset = (page - 1) * limit;
    const pageRefs = refs.slice(offset, offset + limit);

    const wanted = {
      card: new Set(
        pageRefs.filter((r) => r.type === 'card').map((r) => r.key),
      ),
      connection: new Set(
        pageRefs.filter((r) => r.type === 'connection').map((r) => r.key),
      ),
      collection: new Set(
        pageRefs.filter((r) => r.type === 'collection').map((r) => r.key),
      ),
    };

    const [cardMapResult, connMapResult, collMapResult] = await Promise.all([
      this.hydrateCards(
        cardsResult.items.filter((item) => wanted.card.has(item.parentCardId)),
        callingUserId,
        enricher,
      ),
      this.hydrateConnections(
        connectionsResult.items.filter((item) =>
          wanted.connection.has(item.connection.id),
        ),
        callingUserId,
        enricher,
      ),
      this.hydrateCollections(
        collectionsResult.items.filter((item) =>
          wanted.collection.has(item.id),
        ),
        callingUserId,
        enricher,
      ),
    ]);
    if (cardMapResult.isErr()) return err(cardMapResult.error);
    if (connMapResult.isErr()) return err(connMapResult.error);
    if (collMapResult.isErr()) return err(collMapResult.error);

    const items: TaggedItemDTO[] = [];
    for (const ref of pageRefs) {
      if (ref.type === 'card') {
        const card = cardMapResult.value.get(ref.key);
        if (card) items.push({ type: 'card', card });
      } else if (ref.type === 'connection') {
        const connection = connMapResult.value.get(ref.key);
        if (connection) items.push({ type: 'connection', connection });
      } else {
        const collection = collMapResult.value.get(ref.key);
        if (collection) items.push({ type: 'collection', collection });
      }
    }

    const totalCount =
      cardsResult.totalCount +
      connectionsResult.totalCount +
      collectionsResult.totalCount;

    return ok({
      tag,
      items,
      pagination: paginate(totalCount),
    });
  }

  private async hydrateCards(
    items: TaggedCardResultDTO[],
    callingUserId: string | undefined,
    enricher: ProfileEnricher,
  ): Promise<Result<Map<string, TaggedCardDTO>>> {
    if (items.length === 0) return ok(new Map());

    const cardIds = Array.from(new Set(items.map((item) => item.parentCardId)));
    const viewMap = await this.cardQueryRepo.getBatchUrlCardViews(
      cardIds,
      callingUserId,
    );
    const views = cardIds
      .map((id) => viewMap.get(id))
      .filter((view): view is UrlCardView => !!view);

    const enrichResult = await enricher.enrichWithAuthors(
      views,
      (view) => view.authorId,
      callingUserId,
      { mapToUser: false },
    );
    if (enrichResult.isErr()) {
      return err(enrichResult.error);
    }

    const enriched = enrichResult.value as unknown as TaggedCardDTO[];
    return ok(new Map(enriched.map((card) => [card.id, card])));
  }

  private async hydrateConnections(
    items: ConnectionForUserDTO[],
    callingUserId: string | undefined,
    enricher: ProfileEnricher,
  ): Promise<Result<Map<string, TaggedConnectionDTO>>> {
    if (items.length === 0) return ok(new Map());

    const curatorIds = [
      ...new Set(items.map((item) => item.connection.curatorId)),
    ];
    const profileMapResult = await enricher.buildProfileMap(
      curatorIds,
      callingUserId,
      { skipFailures: true, mapToUser: false },
    );
    if (profileMapResult.isErr()) {
      return err(profileMapResult.error);
    }
    const profileMap = profileMapResult.value;

    const uniqueUrls = Array.from(
      new Set(items.flatMap((item) => [item.sourceUrl, item.targetUrl])),
    );
    const urlInfoMap = await this.cardQueryRepo.getBatchUrlLibraryInfo(
      uniqueUrls,
      callingUserId,
    );

    const toUrlView = (
      url: string,
      storedMetadata: any,
    ): TaggedConnectionUrlDTO => {
      const info = urlInfoMap.get(url);
      const meta = storedMetadata || undefined;
      return {
        url,
        metadata: meta
          ? {
              url: meta.url || url,
              title: meta.title,
              description: meta.description,
              author: meta.author,
              siteName: meta.siteName,
              imageUrl: meta.imageUrl,
              type: meta.type,
              doi: meta.doi,
              isbn: meta.isbn,
            }
          : { url },
        urlLibraryCount: info?.urlLibraryCount ?? 0,
        urlInLibrary: info?.urlInLibrary,
        urlConnectionCount: info?.urlConnectionCount,
        urlIsConnected: info?.urlIsConnected,
      };
    };

    const entries = items
      .map((item): [string, TaggedConnectionDTO] | null => {
        const curator = profileMap.get(item.connection.curatorId);
        if (!curator) return null;
        return [
          item.connection.id,
          {
            connection: {
              id: item.connection.id,
              type: item.connection.type,
              note: item.connection.note,
              createdAt: item.connection.createdAt.toISOString(),
              updatedAt: item.connection.updatedAt.toISOString(),
              curator: curator as User,
            },
            source: toUrlView(item.sourceUrl, item.sourceUrlMetadata),
            target: toUrlView(item.targetUrl, item.targetUrlMetadata),
          },
        ];
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return ok(new Map(entries));
  }

  private async hydrateCollections(
    items: CollectionQueryResultDTO[],
    callingUserId: string | undefined,
    enricher: ProfileEnricher,
  ): Promise<Result<Map<string, TaggedCollectionDTO>>> {
    if (items.length === 0) return ok(new Map());

    const authorIds = [...new Set(items.map((item) => item.authorId))];
    const profileMapResult = await enricher.buildProfileMap(
      authorIds,
      callingUserId,
      { skipFailures: true, mapToUser: false },
    );
    if (profileMapResult.isErr()) {
      return err(profileMapResult.error);
    }
    const profileMap = profileMapResult.value;

    const entries = items
      .map((item): [string, TaggedCollectionDTO] | null => {
        const author = profileMap.get(item.authorId);
        if (!author) return null;
        return [
          item.id,
          {
            id: item.id,
            uri: item.uri,
            name: item.name,
            description: item.description,
            accessType: item.accessType as CollectionAccessType,
            cardCount: item.cardCount,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            author: author as User,
          },
        ];
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return ok(new Map(entries));
  }
}
