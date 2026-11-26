import { InMemoryVectorDatabase } from '../../infrastructure/InMemoryVectorDatabase';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { UrlType } from '../../../cards/domain/value-objects/UrlType';

const PAGE_A = 'https://example.com/a';
const PAGE_B = 'https://example.com/b';

function makeDb() {
  const db = InMemoryVectorDatabase.getInstance();
  db.clear();
  return db;
}

describe('InMemoryVectorDatabase annotations', () => {
  it('indexes and searches annotation passages in the ANNOTATION namespace', async () => {
    const db = makeDb();
    await db.indexAnnotation({
      url: PAGE_A,
      exactNormalized: 'the committee found no evidence of collusion',
      passage: 'The committee found no evidence of collusion.',
    });

    const result = await db.semanticSearchCards({
      query: 'committee evidence',
      limit: 10,
      cardType: CardTypeEnum.ANNOTATION,
    });

    expect(result.isOk()).toBe(true);
    const hits = result.unwrap();
    expect(hits).toHaveLength(1);
    expect(hits[0]!.cardType).toBe(CardTypeEnum.ANNOTATION);
    expect(hits[0]!.url).toBe(PAGE_A);
    if (hits[0]!.cardType === CardTypeEnum.ANNOTATION) {
      expect(hits[0]!.exactNormalized).toBe(
        'the committee found no evidence of collusion',
      );
    }
  });

  it('routes cardType URL to the URL index only', async () => {
    const db = makeDb();
    await db.indexUrl({
      url: PAGE_B,
      title: 'Surveillance advertising research',
      description: 'A long enough description of ad tech practices',
      type: UrlType.ARTICLE,
    });
    await db.indexAnnotation({
      url: PAGE_A,
      exactNormalized: 'surveillance advertising tracks users everywhere',
      passage: 'Surveillance advertising tracks users everywhere.',
    });

    const urlOnly = await db.semanticSearchCards({
      query: 'surveillance advertising',
      limit: 10,
      cardType: CardTypeEnum.URL,
    });
    expect(urlOnly.unwrap().map((hit) => hit.cardType)).toEqual([
      CardTypeEnum.URL,
    ]);

    const annotationOnly = await db.semanticSearchCards({
      query: 'surveillance advertising',
      limit: 10,
      cardType: CardTypeEnum.ANNOTATION,
    });
    expect(annotationOnly.unwrap().map((hit) => hit.cardType)).toEqual([
      CardTypeEnum.ANNOTATION,
    ]);
  });

  it('blends both card types sorted by similarity with a per-URL cap', async () => {
    const db = makeDb();
    // One URL hit plus three annotation passages on the SAME url — the cap
    // allows at most 2 hits for PAGE_A in total
    await db.indexUrl({
      url: PAGE_A,
      title: 'climate mitigation policy',
      description: 'a long description of climate mitigation policy options',
    });
    for (const passage of [
      'climate mitigation policy requires coordinated action',
      'climate mitigation policy costs are manageable',
      'climate mitigation policy benefits accrue early',
    ]) {
      await db.indexAnnotation({
        url: PAGE_A,
        exactNormalized: passage,
        passage: `${passage}.`,
      });
    }
    await db.indexUrl({
      url: PAGE_B,
      title: 'climate mitigation policy review',
      description: 'another long description about climate mitigation policy',
    });

    const blended = await db.semanticSearchCards({
      query: 'climate mitigation policy',
      limit: 10,
    });
    const hits = blended.unwrap();

    const perUrl = new Map<string, number>();
    for (const hit of hits) {
      perUrl.set(hit.url, (perUrl.get(hit.url) ?? 0) + 1);
    }
    expect(perUrl.get(PAGE_A)).toBeLessThanOrEqual(2);
    // Sorted by similarity descending
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]!.similarity).toBeLessThanOrEqual(hits[i - 1]!.similarity);
    }
  });

  it('filters by urlType per namespace (URL metadata.type vs annotation urlType)', async () => {
    const db = makeDb();
    await db.indexUrl({
      url: PAGE_A,
      title: 'video about subject matter at length',
      description: 'a sufficiently long description of the subject matter',
      type: UrlType.VIDEO,
    });
    await db.indexAnnotation({
      url: PAGE_B,
      exactNormalized: 'subject matter discussed at length in the video',
      passage: 'Subject matter discussed at length in the video.',
      urlType: UrlType.VIDEO,
    });

    const videoHits = await db.semanticSearchCards({
      query: 'subject matter video',
      limit: 10,
      urlType: UrlType.VIDEO,
    });
    expect(videoHits.unwrap()).toHaveLength(2);

    const articleHits = await db.semanticSearchCards({
      query: 'subject matter video',
      limit: 10,
      urlType: UrlType.ARTICLE,
    });
    expect(articleHits.unwrap()).toHaveLength(0);
  });

  it('upserts the same passage idempotently across users', async () => {
    const db = makeDb();
    await db.indexAnnotation({
      url: PAGE_A,
      exactNormalized: 'a shared passage on a shared page',
      passage: 'A shared passage on a shared page.',
    });
    await db.indexAnnotation({
      url: PAGE_A,
      exactNormalized: 'a shared passage on a shared page',
      passage: 'A shared passage on a shared page.',
    });

    expect(db.getIndexedAnnotationCount()).toBe(1);
  });

  it('deletes by url and normalized passage', async () => {
    const db = makeDb();
    await db.indexAnnotation({
      url: PAGE_A,
      exactNormalized: 'a passage that will be removed',
      passage: 'A passage that will be removed.',
    });

    await db.deleteAnnotation(PAGE_A, 'a passage that will be removed');

    expect(db.getIndexedAnnotationCount()).toBe(0);
    const result = await db.semanticSearchCards({
      query: 'passage removed',
      limit: 10,
      cardType: CardTypeEnum.ANNOTATION,
    });
    expect(result.unwrap()).toHaveLength(0);
  });

  it('applies the similarity threshold', async () => {
    const db = makeDb();
    await db.indexAnnotation({
      url: PAGE_A,
      exactNormalized: 'quantum computing error correction',
      passage: 'Quantum computing error correction.',
    });

    const below = await db.semanticSearchCards({
      query: 'completely different unrelated topic',
      limit: 10,
      cardType: CardTypeEnum.ANNOTATION,
      threshold: 1.0,
    });
    expect(below.unwrap()).toHaveLength(0);
  });
});
