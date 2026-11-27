import { GetTaggedItemsUseCase } from '../../application/useCases/queries/GetTaggedItemsUseCase';
import { ITagQueryRepository } from '../../domain/ITagQueryRepository';
import {
  AnnotationCardView,
  ICardQueryRepository,
  UrlCardView,
} from '../../domain/ICardQueryRepository';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { IProfileService } from '../../domain/services/IProfileService';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { ok } from '../../../../shared/core/Result';
import { DID } from '../../../atproto/domain/DID';

const authorDid = 'did:plc:author1';

const profileService: IProfileService = {
  getProfile: async (userId: string) =>
    ok({ id: userId, name: `Name of ${userId}`, handle: `${userId}.handle` }),
  getProfiles: async (userIds: string[]) => {
    const map = new Map();
    for (const userId of userIds) {
      map.set(userId, {
        id: userId,
        name: `Name of ${userId}`,
        handle: `${userId}.handle`,
      });
    }
    return ok(map);
  },
};

const identityResolver = {
  resolveToDID: async (identifier: any) =>
    ok(DID.create(identifier.value).unwrap()),
} as IIdentityResolutionService;

function makeCardView(id: string): UrlCardView {
  return {
    id,
    type: CardTypeEnum.URL,
    url: `https://example.com/${id}`,
    cardContent: { url: `https://example.com/${id}`, title: `Card ${id}` },
    libraryCount: 1,
    urlLibraryCount: 2,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    authorId: authorDid,
    note: { id: `note-${id}`, text: `#history note on ${id}` },
  };
}

function makeAnnotationView(id: string): AnnotationCardView {
  return {
    id,
    type: CardTypeEnum.ANNOTATION,
    url: `https://example.com/doc#${id}`,
    libraryCount: 1,
    selectors: [{ type: 'TextQuoteSelector', exact: 'highlighted text' }],
    note: `#history annotation on ${id}`,
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2023-03-16'),
    authorId: authorDid,
  };
}

function makeTagRepo(
  overrides: Partial<ITagQueryRepository>,
): ITagQueryRepository {
  return {
    getRecentTexts: async () => [],
    getTaggedCards: async () => ({ items: [], totalCount: 0, hasMore: false }),
    getTaggedConnections: async () => ({
      items: [],
      totalCount: 0,
      hasMore: false,
    }),
    getTaggedCollections: async () => ({
      items: [],
      totalCount: 0,
      hasMore: false,
    }),
    ...overrides,
  };
}

function makeCardQueryRepo(
  views: UrlCardView[],
  annotationViews: AnnotationCardView[] = [],
): ICardQueryRepository {
  return {
    getBatchUrlCardViews: async (cardIds: string[]) =>
      new Map(
        views
          .filter((v) => cardIds.includes(v.id))
          .map((v) => [v.id, v] as const),
      ),
    getBatchAnnotationCardViews: async (cardIds: string[]) =>
      new Map(
        annotationViews
          .filter((v) => cardIds.includes(v.id))
          .map((v) => [v.id, v] as const),
      ),
    getBatchUrlLibraryInfo: async (urls: string[]) =>
      new Map(
        urls.map((url) => [
          url,
          {
            urlLibraryCount: 3,
            urlInLibrary: false,
            urlConnectionCount: 1,
            urlIsConnected: false,
            metadata: { url },
          },
        ]),
      ),
  } as unknown as ICardQueryRepository;
}

describe('GetTaggedItemsUseCase', () => {
  it('returns tagged cards enriched with author profiles, newest note first', async () => {
    const tagRepo = makeTagRepo({
      getTaggedCards: async () => ({
        items: [
          {
            kind: 'note' as const,
            cardId: 'card-2',
            noteCreatedAt: new Date('2023-02-01'),
          },
          {
            kind: 'note' as const,
            cardId: 'card-1',
            noteCreatedAt: new Date('2023-01-01'),
          },
        ],
        totalCount: 2,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([makeCardView('card-1'), makeCardView('card-2')]),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({ tag: 'history', itemType: 'card' });

    const value = result.unwrap();
    expect(value.itemType).toBe('card');
    expect(value.cards!.map((c) => c.id)).toEqual(['card-2', 'card-1']);
    expect(value.cards![0]!.author.handle).toBe(`${authorDid}.handle`);
    expect(
      (value.cards![0] as unknown as { note?: { text: string } }).note?.text,
    ).toContain('#history');
    expect(value.pagination.totalCount).toBe(2);
  });

  it('normalizes the tag (leading # and case)', async () => {
    const seen: string[] = [];
    const tagRepo = makeTagRepo({
      getTaggedCards: async (tag: string) => {
        seen.push(tag);
        return { items: [], totalCount: 0, hasMore: false };
      },
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([]),
      profileService,
      identityResolver,
    );

    await useCase.execute({ tag: '#History', itemType: 'card' });

    expect(seen).toEqual(['history']);
  });

  it('blends all three types newest-first when no itemType is given', async () => {
    const windows: { page: number; limit: number }[] = [];
    const tagRepo = makeTagRepo({
      getTaggedCards: async (_tag, options) => {
        windows.push({ page: options.page, limit: options.limit });
        return {
          items: [
            {
              kind: 'note' as const,
              cardId: 'card-2',
              noteCreatedAt: new Date('2023-04-01'),
            },
            {
              kind: 'note' as const,
              cardId: 'card-1',
              noteCreatedAt: new Date('2023-01-01'),
            },
          ],
          totalCount: 2,
          hasMore: false,
        };
      },
      getTaggedConnections: async () => ({
        items: [
          {
            connection: {
              id: 'conn-1',
              note: 'about #history',
              createdAt: new Date('2023-03-01'),
              updatedAt: new Date('2023-03-01'),
              curatorId: authorDid,
            },
            sourceUrl: 'https://a.com',
            sourceUrlMetadata: undefined,
            targetUrl: 'https://b.com',
            targetUrlMetadata: undefined,
          },
        ],
        totalCount: 1,
        hasMore: false,
      }),
      getTaggedCollections: async () => ({
        items: [
          {
            id: 'coll-1',
            name: 'History things',
            description: 'about #history',
            accessType: 'OPEN',
            updatedAt: new Date('2023-02-02'),
            createdAt: new Date('2023-02-01'),
            cardCount: 4,
            authorId: authorDid,
          },
        ],
        totalCount: 1,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([makeCardView('card-1'), makeCardView('card-2')]),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({ tag: 'history', page: 1, limit: 3 });

    const value = result.unwrap();
    expect(value.itemType).toBeUndefined();
    expect(
      value.items!.map((item) =>
        item.type === 'card'
          ? item.card.id
          : item.type === 'connection'
            ? item.connection.connection.id
            : item.collection.id,
      ),
    ).toEqual(['card-2', 'conn-1', 'coll-1']);
    expect(value.pagination.totalCount).toBe(4);
    expect(value.pagination.hasMore).toBe(true);
    // Merge window: each per-type query fetches the first page*limit items
    expect(windows).toEqual([{ page: 1, limit: 3 }]);
  });

  it('returns the second blended page correctly', async () => {
    const tagRepo = makeTagRepo({
      getTaggedCards: async (_tag, options) => ({
        items: [
          {
            kind: 'note' as const,
            cardId: 'card-2',
            noteCreatedAt: new Date('2023-04-01'),
          },
          {
            kind: 'note' as const,
            cardId: 'card-1',
            noteCreatedAt: new Date('2023-01-01'),
          },
        ].slice(0, options.limit),
        totalCount: 2,
        hasMore: false,
      }),
      getTaggedCollections: async () => ({
        items: [
          {
            id: 'coll-1',
            name: 'History things',
            description: 'about #history',
            accessType: 'OPEN',
            updatedAt: new Date('2023-02-02'),
            createdAt: new Date('2023-02-01'),
            cardCount: 4,
            authorId: authorDid,
          },
        ],
        totalCount: 1,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([makeCardView('card-1'), makeCardView('card-2')]),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({ tag: 'history', page: 2, limit: 2 });

    const value = result.unwrap();
    // Global order: card-2 (Apr), coll-1 (Feb), card-1 (Jan) → page 2 = [card-1]
    expect(
      value.items!.map((item) =>
        item.type === 'card'
          ? item.card.id
          : item.type === 'collection'
            ? item.collection.id
            : item.connection.connection.id,
      ),
    ).toEqual(['card-1']);
    expect(value.pagination.hasMore).toBe(false);
  });

  it('returns tagged connections with curator profiles and url stats', async () => {
    const tagRepo = makeTagRepo({
      getTaggedConnections: async () => ({
        items: [
          {
            connection: {
              id: 'conn-1',
              note: 'about #history',
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-01'),
              curatorId: authorDid,
            },
            sourceUrl: 'https://a.com',
            sourceUrlMetadata: { url: 'https://a.com', title: 'A' },
            targetUrl: 'https://b.com',
            targetUrlMetadata: undefined,
          },
        ],
        totalCount: 1,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([]),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({
      tag: 'history',
      itemType: 'connection',
    });

    const value = result.unwrap();
    expect(value.itemType).toBe('connection');
    const conn = value.connections![0]!;
    expect(conn.connection.id).toBe('conn-1');
    expect(conn.connection.curator.handle).toBe(`${authorDid}.handle`);
    expect(conn.source.metadata.title).toBe('A');
    expect(conn.target.metadata.url).toBe('https://b.com');
    expect(conn.source.urlLibraryCount).toBe(3);
  });

  it('returns tagged collections with author profiles', async () => {
    const tagRepo = makeTagRepo({
      getTaggedCollections: async () => ({
        items: [
          {
            id: 'coll-1',
            name: 'History things',
            description: 'about #history',
            accessType: 'OPEN',
            updatedAt: new Date('2023-01-02'),
            createdAt: new Date('2023-01-01'),
            cardCount: 4,
            authorId: authorDid,
          },
        ],
        totalCount: 1,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([]),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({
      tag: 'history',
      itemType: 'collection',
    });

    const value = result.unwrap();
    expect(value.itemType).toBe('collection');
    expect(value.collections![0]!.name).toBe('History things');
    expect(value.collections![0]!.author.handle).toBe(`${authorDid}.handle`);
  });

  it('returns tagged annotation cards alongside note-backed cards', async () => {
    const tagRepo = makeTagRepo({
      getTaggedCards: async () => ({
        items: [
          {
            kind: 'annotation' as const,
            cardId: 'annot-1',
            noteCreatedAt: new Date('2023-02-15'),
          },
          {
            kind: 'note' as const,
            cardId: 'card-1',
            noteCreatedAt: new Date('2023-01-01'),
          },
        ],
        totalCount: 2,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo(
        [makeCardView('card-1')],
        [makeAnnotationView('annot-1')],
      ),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({ tag: 'history', itemType: 'card' });

    const value = result.unwrap();
    expect(value.itemType).toBe('card');
    expect(value.cards!.map((c) => c.id)).toEqual(['annot-1', 'card-1']);
    const annotation = value.cards![0]!;
    expect(annotation.type).toBe('ANNOTATION');
    expect(annotation.author.handle).toBe(`${authorDid}.handle`);
    expect(annotation.note).toContain('#history');
    expect(value.pagination.totalCount).toBe(2);
  });

  it('blends tagged annotations into the card stream newest-first', async () => {
    const tagRepo = makeTagRepo({
      getTaggedCards: async () => ({
        items: [
          {
            kind: 'note' as const,
            cardId: 'card-1',
            noteCreatedAt: new Date('2023-04-01'),
          },
          {
            kind: 'annotation' as const,
            cardId: 'annot-1',
            noteCreatedAt: new Date('2023-02-15'),
          },
        ],
        totalCount: 2,
        hasMore: false,
      }),
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo(
        [makeCardView('card-1')],
        [makeAnnotationView('annot-1')],
      ),
      profileService,
      identityResolver,
    );

    const result = await useCase.execute({ tag: 'history', limit: 10 });

    const value = result.unwrap();
    expect(
      value.items!.map((item) => (item.type === 'card' ? item.card.id : null)),
    ).toEqual(['card-1', 'annot-1']);
    expect(value.items![1]!.type).toBe('card');
    expect((value.items![1] as { card: { type: string } }).card.type).toBe(
      'ANNOTATION',
    );
  });

  it('passes the resolved user DID to the repository', async () => {
    const seen: (string | undefined)[] = [];
    const tagRepo = makeTagRepo({
      getTaggedCards: async (_tag, options) => {
        seen.push(options.userDid);
        return { items: [], totalCount: 0, hasMore: false };
      },
    });
    const useCase = new GetTaggedItemsUseCase(
      tagRepo,
      makeCardQueryRepo([]),
      profileService,
      identityResolver,
    );

    await useCase.execute({ tag: 'history', user: authorDid });

    expect(seen).toEqual([authorDid]);
  });
});
