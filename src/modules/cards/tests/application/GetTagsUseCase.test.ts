import { GetTagsUseCase } from '../../application/useCases/queries/GetTagsUseCase';
import {
  ITagQueryRepository,
  RecentTextDTO,
} from '../../domain/ITagQueryRepository';

function makeRepo(
  byUser: Record<string, RecentTextDTO[]>,
  global: RecentTextDTO[],
): ITagQueryRepository {
  return {
    getRecentTexts: async ({ userDid }) =>
      userDid ? (byUser[userDid] ?? []) : global,
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
  };
}

describe('GetTagsUseCase', () => {
  const did = 'did:plc:someone';

  it("returns the user's tags ordered by most recent use", async () => {
    const repo = makeRepo(
      {
        [did]: [
          { text: 'older #alpha note', createdAt: new Date('2023-01-01') },
          { text: 'newer #beta note', createdAt: new Date('2023-02-01') },
        ],
      },
      [],
    );
    const useCase = new GetTagsUseCase(repo);

    const result = await useCase.execute({ callingUserId: did });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().tags.map((t) => t.tag)).toEqual(['beta', 'alpha']);
  });

  it('dedupes a tag across texts, keeping the most recent use', async () => {
    const repo = makeRepo(
      {
        [did]: [
          { text: '#alpha first', createdAt: new Date('2023-01-01') },
          { text: '#alpha again', createdAt: new Date('2023-03-01') },
          { text: '#beta once', createdAt: new Date('2023-02-01') },
        ],
      },
      [],
    );
    const useCase = new GetTagsUseCase(repo);

    const result = await useCase.execute({ callingUserId: did });

    const tags = result.unwrap().tags;
    expect(tags.map((t) => t.tag)).toEqual(['alpha', 'beta']);
    expect(tags[0]!.lastUsed).toBe(new Date('2023-03-01').toISOString());
  });

  it('falls back to global tags when the user has none', async () => {
    const repo = makeRepo(
      { [did]: [{ text: 'no tags here', createdAt: new Date() }] },
      [{ text: 'global #gamma', createdAt: new Date('2023-01-01') }],
    );
    const useCase = new GetTagsUseCase(repo);

    const result = await useCase.execute({ callingUserId: did });

    expect(result.unwrap().tags.map((t) => t.tag)).toEqual(['gamma']);
  });

  it('uses the global window when unauthenticated', async () => {
    const repo = makeRepo({}, [
      { text: 'global #delta', createdAt: new Date('2023-01-01') },
    ]);
    const useCase = new GetTagsUseCase(repo);

    const result = await useCase.execute({});

    expect(result.unwrap().tags.map((t) => t.tag)).toEqual(['delta']);
  });

  it('prefix-filters with q, ignoring case and a leading hash', async () => {
    const repo = makeRepo(
      {
        [did]: [
          { text: '#history #maps #hist', createdAt: new Date('2023-01-01') },
        ],
      },
      [],
    );
    const useCase = new GetTagsUseCase(repo);

    const result = await useCase.execute({ callingUserId: did, q: '#Hist' });

    expect(result.unwrap().tags.map((t) => t.tag)).toEqual(['history', 'hist']);
  });

  it('respects the limit', async () => {
    const repo = makeRepo(
      {
        [did]: [{ text: '#a #b #c #d', createdAt: new Date('2023-01-01') }],
      },
      [],
    );
    const useCase = new GetTagsUseCase(repo);

    const result = await useCase.execute({ callingUserId: did, limit: 2 });

    expect(result.unwrap().tags).toHaveLength(2);
  });
});
