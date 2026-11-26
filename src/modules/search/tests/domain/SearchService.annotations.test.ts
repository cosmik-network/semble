import { SearchService } from '../../domain/services/SearchService';
import { InMemoryVectorDatabase } from '../../infrastructure/InMemoryVectorDatabase';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { UrlType } from '../../../cards/domain/value-objects/UrlType';
import { URL } from '../../../cards/domain/value-objects/URL';
import { annotationPassageKey } from '../../../cards/domain/value-objects/selectors/normalizeQuotedText';

const PAGE_A = 'https://example.com/a';
const PAGE_B = 'https://example.com/b';
const PASSAGE_A = 'the committee found no evidence of collusion whatsoever';
const PASSAGE_B = 'climate mitigation policy requires coordinated action';

function makeAnnotationView(props: {
  id: string;
  url: string;
  exactNormalized: string;
  authorId: string;
  updatedAt?: Date;
}) {
  return {
    id: props.id,
    type: CardTypeEnum.ANNOTATION,
    url: props.url,
    libraryCount: 2,
    connectionCount: 0,
    selectors: [{ type: 'TextQuoteSelector', exact: props.exactNormalized }],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: props.updatedAt ?? new Date('2026-01-02T00:00:00Z'),
    authorId: props.authorId,
  };
}

function makeService(props?: {
  urlTypes?: Map<string, UrlType>;
  annotationCardsByPassage?: Map<
    string,
    ReturnType<typeof makeAnnotationView>[]
  >;
  urlsSavedByUser?: Set<string>;
}) {
  const vectorDatabase = InMemoryVectorDatabase.getInstance();
  vectorDatabase.clear();

  const cardQueryRepository = {
    getUrlTypes: jest.fn(
      async (urls: string[]) =>
        new Map((props?.urlTypes ?? new Map()).entries()),
    ),
    getAnnotationCardsByPassages: jest.fn(
      async (passages: { url: string; exactNormalized: string }[]) => {
        const result = new Map<
          string,
          ReturnType<typeof makeAnnotationView>[]
        >();
        for (const passage of passages) {
          const key = annotationPassageKey(
            passage.url,
            passage.exactNormalized,
          );
          const cards = props?.annotationCardsByPassage?.get(key);
          if (cards) {
            result.set(key, cards);
          }
        }
        return result;
      },
    ),
    getBatchUrlLibraryInfo: jest.fn(
      async (urls: string[]) =>
        new Map(
          urls.map((url) => [
            url,
            {
              urlLibraryCount: 3,
              urlInLibrary: false,
              urlConnectionCount: 1,
              urlIsConnected: false,
            },
          ]),
        ),
    ),
    getUrlsSavedByUser: jest.fn(
      async (_userId: string, urls: string[]) =>
        new Set(urls.filter((url) => props?.urlsSavedByUser?.has(url))),
    ),
  } as any;

  const service = new SearchService(
    vectorDatabase,
    {} as any, // metadataService — unused by annotation paths under test
    cardQueryRepository,
  );

  return { service, vectorDatabase, cardQueryRepository };
}

describe('SearchService annotations', () => {
  describe('indexAnnotation', () => {
    it('skips passages below the min-length floor', async () => {
      const { service, vectorDatabase } = makeService();

      const result = await service.indexAnnotation(
        URL.create(PAGE_A).unwrap(),
        'Too short.',
        'too short.',
      );

      expect(result.isOk()).toBe(true);
      expect(vectorDatabase.getIndexedAnnotationCount()).toBe(0);
    });

    it('resolves urlType from URL cards and stores it on the vector', async () => {
      const { service, vectorDatabase } = makeService({
        urlTypes: new Map([[PAGE_A, UrlType.RESEARCH]]),
      });

      await service.indexAnnotation(
        URL.create(PAGE_A).unwrap(),
        `${PASSAGE_A}.`,
        PASSAGE_A,
      );

      const hits = await vectorDatabase.semanticSearchCards({
        query: 'committee evidence collusion',
        limit: 10,
        cardType: CardTypeEnum.ANNOTATION,
        urlType: UrlType.RESEARCH,
      });
      expect(hits.unwrap()).toHaveLength(1);

      const miss = await vectorDatabase.semanticSearchCards({
        query: 'committee evidence collusion',
        limit: 10,
        cardType: CardTypeEnum.ANNOTATION,
        urlType: UrlType.VIDEO,
      });
      expect(miss.unwrap()).toHaveLength(0);
    });
  });

  describe('semanticSearchCards', () => {
    it('returns URL and annotation hits hydrated, in similarity order', async () => {
      const { service } = makeService({
        annotationCardsByPassage: new Map([
          [
            annotationPassageKey(PAGE_A, PASSAGE_A),
            [
              makeAnnotationView({
                id: 'ann-1',
                url: PAGE_A,
                exactNormalized: PASSAGE_A,
                authorId: 'did:plc:author',
              }),
            ],
          ],
        ]),
      });
      const db = InMemoryVectorDatabase.getInstance();
      await db.indexAnnotation({
        url: PAGE_A,
        exactNormalized: PASSAGE_A,
        passage: `${PASSAGE_A}.`,
      });
      await db.indexUrl({
        url: PAGE_B,
        title: 'committee evidence collusion investigation',
        description:
          'a long description about the committee evidence collusion',
      });

      const result = await service.semanticSearchCards(
        'committee evidence collusion',
        { limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const hits = result.unwrap();
      expect(hits.map((hit) => hit.cardType).sort()).toEqual([
        CardTypeEnum.ANNOTATION,
        CardTypeEnum.URL,
      ]);
      // URL hits enriched with library context
      const urlHit = hits.find((hit) => hit.cardType === CardTypeEnum.URL)!;
      if (urlHit.cardType === CardTypeEnum.URL) {
        expect(urlHit.view.urlLibraryCount).toBe(3);
      }
      // Annotation hits carry the resolved view
      const annotationHit = hits.find(
        (hit) => hit.cardType === CardTypeEnum.ANNOTATION,
      )!;
      if (annotationHit.cardType === CardTypeEnum.ANNOTATION) {
        expect(annotationHit.view.id).toBe('ann-1');
      }
      // Sorted by similarity descending
      expect(hits[0]!.similarity).toBeGreaterThanOrEqual(hits[1]!.similarity);
    });

    it('drops annotation hits whose passage resolves to no cards', async () => {
      const { service } = makeService({
        annotationCardsByPassage: new Map(), // orphan passage
      });

      const db = InMemoryVectorDatabase.getInstance();
      await db.indexAnnotation({
        url: PAGE_A,
        exactNormalized: PASSAGE_B,
        passage: `${PASSAGE_B}.`,
      });

      const result = await service.semanticSearchCards(
        'climate mitigation policy coordinated',
        { limit: 10 },
      );

      expect(result.unwrap()).toHaveLength(0);
    });

    it('picks the most recently updated card as the passage representative', async () => {
      const older = makeAnnotationView({
        id: 'ann-old',
        url: PAGE_A,
        exactNormalized: PASSAGE_B,
        authorId: 'did:plc:old',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = makeAnnotationView({
        id: 'ann-new',
        url: PAGE_A,
        exactNormalized: PASSAGE_B,
        authorId: 'did:plc:new',
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      });
      const { service } = makeService({
        annotationCardsByPassage: new Map([
          [annotationPassageKey(PAGE_A, PASSAGE_B), [older, newer]],
        ]),
      });

      const db = InMemoryVectorDatabase.getInstance();
      await db.indexAnnotation({
        url: PAGE_A,
        exactNormalized: PASSAGE_B,
        passage: `${PASSAGE_B}.`,
      });

      const result = await service.semanticSearchCards(
        'climate mitigation policy coordinated',
        { limit: 10 },
      );

      const hit = result.unwrap()[0]!;
      expect(hit.cardType).toBe(CardTypeEnum.ANNOTATION);
      if (hit.cardType === CardTypeEnum.ANNOTATION) {
        expect(hit.view.id).toBe('ann-new');
      }
    });

    it('filters annotations to passages the user authored in user-filtered search', async () => {
      const { service } = makeService({
        urlsSavedByUser: new Set([PAGE_B]),
        annotationCardsByPassage: new Map([
          [
            annotationPassageKey(PAGE_A, PASSAGE_A),
            [
              makeAnnotationView({
                id: 'ann-1',
                url: PAGE_A,
                exactNormalized: PASSAGE_A,
                authorId: 'did:plc:someone-else',
              }),
            ],
          ],
          [
            annotationPassageKey(PAGE_B, PASSAGE_B),
            [
              makeAnnotationView({
                id: 'ann-2',
                url: PAGE_B,
                exactNormalized: PASSAGE_B,
                authorId: 'did:plc:filter-user',
              }),
            ],
          ],
        ]),
      });

      const db = InMemoryVectorDatabase.getInstance();
      await db.indexAnnotation({
        url: PAGE_A,
        exactNormalized: PASSAGE_A,
        passage: `${PASSAGE_A}.`,
      });
      await db.indexAnnotation({
        url: PAGE_B,
        exactNormalized: PASSAGE_B,
        passage: `${PASSAGE_B}.`,
      });

      const result = await service.semanticSearchCards(
        'committee evidence collusion climate mitigation',
        { limit: 10, filterByUserId: 'did:plc:filter-user' },
      );

      const hits = result.unwrap();
      expect(hits).toHaveLength(1);
      expect(hits[0]!.cardType).toBe(CardTypeEnum.ANNOTATION);
      if (hits[0]!.cardType === CardTypeEnum.ANNOTATION) {
        expect(hits[0]!.view.id).toBe('ann-2');
      }
    });
  });
});
