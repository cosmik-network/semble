import { OpenReviewUrlMetadataService } from '../../infrastructure/OpenReviewUrlMetadataService';
import { InMemoryOpenReviewTokenStore } from '../../infrastructure/OpenReviewTokenStore';
import {
  CompositeMetadataService,
  DefaultServicePreference,
} from '../../infrastructure/CompositeMetadataService';
import { IMetadataService } from '../../domain/services/IMetadataService';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { UrlType } from '../../domain/value-objects/UrlType';
import { Result, ok, err } from '../../../../shared/core/Result';

const FORUM_URL = 'https://openreview.net/forum?id=31hQgLw9ak';

const noteResponse = {
  notes: [
    {
      id: '31hQgLw9ak',
      forum: '31hQgLw9ak',
      content: {
        title: { value: 'LLM-Augmented Agent-Based Simulation' },
        authors: { value: ['Lynnette Hui Xian Ng', 'Kathleen M. Carley'] },
        abstract: { value: 'Social media bots are often portrayed...' },
        venue: { value: "Social Sim'26 Poster" },
      },
      cdate: 1782507007890,
      pdate: 1785793853647,
    },
  ],
  count: 1,
};

/** Unsigned JWT with the given exp (seconds) — the service only decodes it. */
function fakeJwt(exp: number): string {
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ exp })}.sig`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

class StubMetadataService implements IMetadataService {
  public callCount = 0;
  constructor(private result: Result<UrlMetadata>) {}
  async fetchMetadata(): Promise<Result<UrlMetadata>> {
    this.callCount++;
    return this.result;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('OpenReviewUrlMetadataService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('extractForumId', () => {
    it.each([
      [FORUM_URL, '31hQgLw9ak'],
      ['https://www.openreview.net/forum?id=abc123', 'abc123'],
      ['https://openreview.net/forum/?id=abc123&noteId=xyz', 'abc123'],
    ])('extracts the forum id from %s', (url, expected) => {
      expect(OpenReviewUrlMetadataService.extractForumId(url)).toBe(expected);
    });

    it.each([
      'https://openreview.net/group?id=ICLR.cc/2025/Conference',
      'https://openreview.net/forum',
      'https://openreview.net/forum?id=',
      'https://notopenreview.net/forum?id=abc',
      'https://example.com/forum?id=abc',
      'not a url',
    ])('rejects %s', (url) => {
      expect(OpenReviewUrlMetadataService.extractForumId(url)).toBeNull();
    });
  });

  it('logs in and maps the note to RESEARCH metadata', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'tok-1' }))
      .mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw');
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isOk()).toBe(true);
    const metadata = result.unwrap();
    expect(metadata.type).toBe(UrlType.RESEARCH);
    expect(metadata.title).toBe('LLM-Augmented Agent-Based Simulation');
    expect(metadata.author).toBe('Lynnette Hui Xian Ng, Kathleen M. Carley');
    expect(metadata.description).toBe(
      'Social media bots are often portrayed...',
    );
    expect(metadata.siteName).toBe("Social Sim'26 Poster");
    expect(metadata.publishedDate?.getTime()).toBe(1785793853647);

    const [loginUrl, loginInit] = fetchMock.mock.calls[0];
    expect(loginUrl).toBe('https://api2.openreview.net/login');
    expect(JSON.parse(loginInit.body)).toEqual({ id: 'a@b.c', password: 'pw' });
    const [notesUrl, notesInit] = fetchMock.mock.calls[1];
    expect(notesUrl).toBe('https://api2.openreview.net/notes?id=31hQgLw9ak');
    expect(notesInit.headers.Authorization).toBe('Bearer tok-1');
  });

  it('reuses the token across requests', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'tok-1' }))
      .mockResolvedValueOnce(jsonResponse(noteResponse))
      .mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw');
    const url = URL.create(FORUM_URL).unwrap();
    await service.fetchMetadata(url);
    await service.fetchMetadata(url);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('logs in again when the token is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'tok-1' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 403))
      .mockResolvedValueOnce(jsonResponse({ token: 'tok-2' }))
      .mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw');
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isOk()).toBe(true);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe(
      'Bearer tok-2',
    );
  });

  it('uses a stored token without logging in', async () => {
    const store = new InMemoryOpenReviewTokenStore();
    await store.set('stored-tok', new Date(Date.now() + 60_000));
    fetchMock.mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw', store);
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isOk()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/notes');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer stored-tok',
    );
  });

  it('stores the login token until shortly before its JWT exp', async () => {
    const store = new InMemoryOpenReviewTokenStore();
    const setSpy = jest.spyOn(store, 'set');
    const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
    const token = fakeJwt(exp);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token }))
      .mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw', store);
    await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(setSpy).toHaveBeenCalledTimes(1);
    const [storedToken, expiresAt] = setSpy.mock.calls[0]!;
    expect(storedToken).toBe(token);
    expect(expiresAt.getTime()).toBe(exp * 1000 - 5 * 60 * 1000);
    expect(await store.get()).toBe(token);
  });

  it('replaces a rejected stored token with a fresh login', async () => {
    const store = new InMemoryOpenReviewTokenStore();
    await store.set('stale-tok', new Date(Date.now() + 60_000));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ token: 'fresh-tok' }))
      .mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw', store);
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isOk()).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api2.openreview.net/login',
    );
    expect(await store.get()).toBe('fresh-tok');
  });

  it('logs in when the token store fails', async () => {
    const store = new InMemoryOpenReviewTokenStore();
    jest.spyOn(store, 'get').mockRejectedValue(new Error('redis down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'tok-1' }))
      .mockResolvedValueOnce(jsonResponse(noteResponse));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw', store);
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isOk()).toBe(true);
    warn.mockRestore();
  });

  it('errors without calling the API when credentials are missing', async () => {
    const service = new OpenReviewUrlMetadataService('', '');
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isErr()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('errors when the note does not exist', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ token: 'tok-1' }))
      .mockResolvedValueOnce(jsonResponse({ notes: [], count: 0 }));

    const service = new OpenReviewUrlMetadataService('a@b.c', 'pw');
    const result = await service.fetchMetadata(URL.create(FORUM_URL).unwrap());

    expect(result.isErr()).toBe(true);
  });
});

describe('CompositeMetadataService URL overrides', () => {
  const forumUrl = URL.create(FORUM_URL).unwrap();

  const openReviewMetadata = UrlMetadata.create({
    url: FORUM_URL,
    title: 'OpenReview title',
    author: 'OpenReview Author',
    type: UrlType.RESEARCH,
  }).unwrap();

  const iframelyMetadata = UrlMetadata.create({
    url: FORUM_URL,
    title: 'Iframely title',
    imageUrl: 'https://openreview.net/image.png',
    type: UrlType.ARTICLE,
  }).unwrap();

  const citoidMetadata = UrlMetadata.create({
    url: FORUM_URL,
    title: 'Citoid title',
    author: 'Citoid Author',
    type: UrlType.ARTICLE,
  }).unwrap();

  function buildService(openReview: IMetadataService) {
    return new CompositeMetadataService(
      new StubMetadataService(ok(iframelyMetadata)),
      new StubMetadataService(ok(citoidMetadata)),
      {
        defaultService: DefaultServicePreference.IFRAMELY,
        urlOverrides: [
          {
            name: 'OpenReview',
            canHandle: (url) => OpenReviewUrlMetadataService.canHandle(url),
            service: openReview,
          },
        ],
      },
    );
  }

  it('overrides general metadata and fills gaps from it', async () => {
    const service = buildService(
      new StubMetadataService(ok(openReviewMetadata)),
    );

    const metadata = (await service.fetchMetadata(forumUrl)).unwrap();

    expect(metadata.title).toBe('OpenReview title');
    expect(metadata.author).toBe('OpenReview Author');
    expect(metadata.type).toBe(UrlType.RESEARCH);
    // Field OpenReview doesn't provide comes from the general services
    expect(metadata.imageUrl).toBe('https://openreview.net/image.png');
  });

  it('falls back to the general services when the override fails', async () => {
    const service = buildService(
      new StubMetadataService(err(new Error('boom'))),
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const metadata = (await service.fetchMetadata(forumUrl)).unwrap();

    expect(metadata.title).not.toBe('OpenReview title');
    warn.mockRestore();
  });

  it('does not call the override for non-matching URLs', async () => {
    const openReview = new StubMetadataService(ok(openReviewMetadata));
    const service = buildService(openReview);

    await service.fetchMetadata(
      URL.create('https://example.com/article').unwrap(),
    );

    expect(openReview.callCount).toBe(0);
  });
});
