import { computeAnnotationCID } from '@semble/types';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCardQueryRepository } from '../../infrastructure/repositories/DrizzleCardQueryRepository';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { annotationSelectors } from '../../infrastructure/repositories/schema/annotationSelector.sql';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { normalizeQuotedText } from '../../domain/value-objects/selectors/normalizeQuotedText';
import { createTestSchema } from '../test-utils/createTestSchema';

const TEST_URL = 'https://example.com/annotated-article';
const PASSAGE = 'the quoted passage';
const OTHER_PASSAGE = 'a different passage';

describe('DrizzleCardQueryRepository - getLibrariesForAnnotation', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCardQueryRepository;

  let curator1: CuratorId;
  let curator2: CuratorId;
  let curator3: CuratorId;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();

    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    queryRepository = new DrizzleCardQueryRepository(db);

    await createTestSchema(db);

    curator1 = CuratorId.create('did:plc:testcurator1').unwrap();
    curator2 = CuratorId.create('did:plc:testcurator2').unwrap();
    curator3 = CuratorId.create('did:plc:testcurator3').unwrap();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(annotationSelectors);
    await db.delete(libraryMemberships);
    await db.delete(cards);
  });

  const insertAnnotationCard = async (props: {
    id: string;
    selectorId: string;
    authorId: string;
    url: string;
    exact: string;
  }) => {
    await db.insert(cards).values({
      id: props.id,
      authorId: props.authorId,
      type: 'ANNOTATION',
      contentData: { note: null },
      url: props.url,
    });
    await db.insert(annotationSelectors).values({
      id: props.selectorId,
      cardId: props.id,
      selectorType: 'TextQuoteSelector',
      ordinal: 0,
      exact: props.exact,
      exactNormalized: normalizeQuotedText(props.exact),
      annotationCid: computeAnnotationCID(
        props.url,
        normalizeQuotedText(props.exact),
      ),
    });
    await db
      .insert(libraryMemberships)
      .values({ cardId: props.id, userId: props.authorId });
  };

  it('returns library members of passage-matching annotation cards only', async () => {
    // Two curators saved the same passage (their own cards), a third saved a
    // different passage on the same URL, and a fourth has a plain URL card
    await insertAnnotationCard({
      id: '11111111-1111-4111-8111-111111111111',
      selectorId: 'aaaa1111-1111-4111-8111-111111111111',
      authorId: curator1.value,
      url: TEST_URL,
      exact: PASSAGE,
    });
    await insertAnnotationCard({
      id: '22222222-2222-4222-8222-222222222222',
      selectorId: 'aaaa2222-2222-4222-8222-222222222222',
      authorId: curator2.value,
      url: TEST_URL,
      exact: PASSAGE,
    });
    await insertAnnotationCard({
      id: '33333333-3333-4333-8333-333333333333',
      selectorId: 'aaaa3333-3333-4333-8333-333333333333',
      authorId: curator3.value,
      url: TEST_URL,
      exact: OTHER_PASSAGE,
    });
    await db.insert(cards).values({
      id: '44444444-4444-4444-8444-444444444444',
      authorId: curator3.value,
      type: 'URL',
      contentData: { metadata: { url: TEST_URL, title: 'Page' } },
      url: TEST_URL,
    });
    await db.insert(libraryMemberships).values({
      cardId: '44444444-4444-4444-8444-444444444444',
      userId: curator3.value,
    });

    const result = await queryRepository.getLibrariesForAnnotation(
      TEST_URL,
      normalizeQuotedText(PASSAGE),
      {
        page: 1,
        limit: 20,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      },
    );

    expect(result.totalCount).toBe(2);
    expect(result.items.map((item) => item.userId).sort()).toEqual(
      [curator1.value, curator2.value].sort(),
    );
    // Each member's card is the annotation card view with its selectors
    expect(result.items[0]!.card.type).toBe('ANNOTATION');
    expect(result.items[0]!.card.selectors[0]!.exact).toBe(PASSAGE);
  });
});
