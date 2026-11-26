import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'crypto';
import { DrizzleCardQueryRepository } from '../../infrastructure/repositories/DrizzleCardQueryRepository';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { annotationSelectors } from '../../infrastructure/repositories/schema/annotationSelector.sql';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { UrlType } from '../../domain/value-objects/UrlType';
import { DID } from '../../../atproto/domain/DID';
import { annotationPassageKey } from '../../domain/value-objects/selectors/normalizeQuotedText';

describe('DrizzleCardQueryRepository - annotation search', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCardQueryRepository;

  const alice = 'did:plc:alice';
  const bob = 'did:plc:bob';
  const urlA = 'https://example.com/a';
  const urlB = 'https://example.com/b';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);
    queryRepository = new DrizzleCardQueryRepository(db);
    await createTestSchema(db);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(annotationSelectors);
    await db.delete(libraryMemberships);
    await db.delete(cards);
  });

  async function insertUrlCard(
    authorId: string,
    url: string,
    urlType?: UrlType,
  ) {
    const id = randomUUID();
    await db.insert(cards).values({
      id,
      authorId,
      type: CardTypeEnum.URL,
      contentData: { url },
      url,
      urlType,
    });
    await db
      .insert(libraryMemberships)
      .values({ cardId: id, userId: authorId });
    return id;
  }

  async function insertAnnotationCard(props: {
    authorId: string;
    url: string;
    exact: string;
    exactNormalized: string;
    note?: string;
    updatedAt?: Date;
  }) {
    const id = randomUUID();
    await db.insert(cards).values({
      id,
      authorId: props.authorId,
      type: CardTypeEnum.ANNOTATION,
      contentData: props.note ? { note: props.note } : {},
      url: props.url,
      updatedAt: props.updatedAt ?? new Date(),
    });
    await db.insert(annotationSelectors).values({
      id: randomUUID(),
      cardId: id,
      selectorType: 'TextQuoteSelector',
      ordinal: 0,
      exact: props.exact,
      exactNormalized: props.exactNormalized,
    });
    await db
      .insert(libraryMemberships)
      .values({ cardId: id, userId: props.authorId });
    return id;
  }

  describe('searchAnnotations', () => {
    it('matches note text, passage text and url, excluding non-matches', async () => {
      await insertAnnotationCard({
        authorId: alice,
        url: urlA,
        exact: 'The committee found no evidence of collusion.',
        exactNormalized: 'the committee found no evidence of collusion',
        note: 'this is a strong claim',
      });
      await insertAnnotationCard({
        authorId: bob,
        url: urlB,
        exact: 'Unrelated passage about gardening.',
        exactNormalized: 'unrelated passage about gardening',
      });

      // All three search surfaces find the first card only
      for (const searchQuery of [
        'strong claim', // note
        'committee collusion', // passage (tokenized)
        'example.com/a', // url
      ]) {
        const result = await queryRepository.searchAnnotations({
          searchQuery,
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        });
        expect(result.totalCount).toBe(1);
        expect(result.items[0]!.url).toBe(urlA);
        expect(result.items[0]!.selectors[0]!.exact).toBe(
          'The committee found no evidence of collusion.',
        );
        expect(result.items[0]!.note).toBe('this is a strong claim');
      }
    });

    it('requires every token to match somewhere', async () => {
      await insertAnnotationCard({
        authorId: alice,
        url: urlA,
        exact: 'The committee found no evidence.',
        exactNormalized: 'the committee found no evidence',
      });

      const result = await queryRepository.searchAnnotations({
        searchQuery: 'committee gardening',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });
      expect(result.totalCount).toBe(0);
    });

    it('resolves urlType through the URL cards of the same url', async () => {
      await insertUrlCard(alice, urlA, UrlType.RESEARCH);
      await insertUrlCard(alice, urlB, UrlType.VIDEO);
      await insertAnnotationCard({
        authorId: bob,
        url: urlA,
        exact: 'Research passage on page A.',
        exactNormalized: 'research passage on page a',
      });
      await insertAnnotationCard({
        authorId: bob,
        url: urlB,
        exact: 'Research passage on page B.',
        exactNormalized: 'research passage on page b',
      });

      const research = await queryRepository.searchAnnotations({
        searchQuery: 'research passage',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
        urlType: UrlType.RESEARCH,
      });
      expect(research.totalCount).toBe(1);
      expect(research.items[0]!.url).toBe(urlA);
    });

    it('filters by author and paginates', async () => {
      for (let i = 0; i < 3; i++) {
        await insertAnnotationCard({
          authorId: i === 0 ? alice : bob,
          url: urlA,
          exact: `Shared passage number ${i} about topic.`,
          exactNormalized: `shared passage number ${i} about topic`,
        });
      }

      const bobFirstPage = await queryRepository.searchAnnotations({
        searchQuery: 'shared passage topic',
        page: 1,
        limit: 1,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });
      expect(bobFirstPage.totalCount).toBe(3);
      expect(bobFirstPage.items).toHaveLength(1);
      expect(bobFirstPage.hasMore).toBe(true);

      const aliceOnly = await queryRepository.searchAnnotations({
        searchQuery: 'shared passage topic',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
        authorDid: DID.create(alice).unwrap(),
      });
      expect(aliceOnly.totalCount).toBe(1);
      expect(aliceOnly.items[0]!.authorId).toBe(alice);
    });
  });

  describe('getAnnotationCardsByPassages', () => {
    it('groups cards by (url, exact_normalized), sharing across authors', async () => {
      // exact_normalized is normalizeQuotedText(exact): whitespace collapsed,
      // not lowercased — the double space in the first exact normalizes away
      const first = await insertAnnotationCard({
        authorId: alice,
        url: urlA,
        exact: 'The  committee found no evidence.',
        exactNormalized: 'The committee found no evidence.',
      });
      const second = await insertAnnotationCard({
        authorId: bob,
        url: urlA,
        exact: 'The committee found no evidence.',
        exactNormalized: 'The committee found no evidence.',
      });
      await insertAnnotationCard({
        authorId: alice,
        url: urlB,
        exact: 'The committee found no evidence.',
        exactNormalized: 'The committee found no evidence.',
      });

      const map = await queryRepository.getAnnotationCardsByPassages([
        { url: urlA, exactNormalized: 'The committee found no evidence.' },
      ]);

      expect(map.size).toBe(1);
      const cardsForPassage = map.get(
        annotationPassageKey(urlA, 'The committee found no evidence.'),
      )!;
      expect(cardsForPassage.map((card) => card.id).sort()).toEqual(
        [first, second].sort(),
      );
    });

    it('omits passages with no cards', async () => {
      const map = await queryRepository.getAnnotationCardsByPassages([
        { url: urlA, exactNormalized: 'nothing matches this' },
      ]);
      expect(map.size).toBe(0);
    });
  });

  describe('getUrlTypes', () => {
    it('returns types only for urls that have typed URL cards', async () => {
      await insertUrlCard(alice, urlA, UrlType.RESEARCH);
      await insertUrlCard(alice, urlB); // no urlType

      const types = await queryRepository.getUrlTypes([urlA, urlB]);
      expect(types.size).toBe(1);
      expect(types.get(urlA)).toBe(UrlType.RESEARCH);
    });
  });
});
