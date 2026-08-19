import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { URL } from '../../domain/value-objects/URL';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { Card } from '../../domain/Card';
import { CardType, CardTypeEnum } from '../../domain/value-objects/CardType';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../domain/value-objects/UrlType';
import { CardContent } from '../../domain/value-objects/CardContent';
import { createTestSchema } from '../test-utils/createTestSchema';

/**
 * Regression coverage for URL metadata field loss.
 *
 * Previously CardMapper.toPersistence omitted publishedDate (so it was never
 * written to content_data at all) and toDomain omitted doi/isbn (so they were
 * dropped whenever a card was loaded as an aggregate). The pre-existing
 * repository tests never populated those fields, so the loss was invisible.
 */
describe('DrizzleCardRepository URL metadata persistence', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let cardRepository: DrizzleCardRepository;
  let curatorId: CuratorId;

  const URL_VALUE = 'https://example.com/research-paper';
  const PUBLISHED_DATE = new Date('2023-05-04T00:00:00.000Z');
  const DOI = '10.1000/xyz123';
  const ISBN = '978-3-16-148410-0';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);
    cardRepository = new DrizzleCardRepository(db);
    await createTestSchema(db);
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  async function saveFullyPopulatedCard(): Promise<Card> {
    const url = URL.create(URL_VALUE).unwrap();
    const metadata = UrlMetadata.create({
      url: URL_VALUE,
      title: 'A Research Paper',
      description: 'An abstract',
      author: 'A. Researcher',
      publishedDate: PUBLISHED_DATE,
      siteName: 'Example Journal',
      imageUrl: 'https://example.com/cover.png',
      type: UrlType.RESEARCH,
      doi: DOI,
      isbn: ISBN,
    }).unwrap();

    const card = Card.create({
      curatorId,
      type: CardType.create(CardTypeEnum.URL).unwrap(),
      content: CardContent.createUrlContent(url, metadata).unwrap(),
      url,
      libraryMemberships: [],
      libraryCount: 0,
    }).unwrap();

    (await cardRepository.save(card)).unwrap();
    return card;
  }

  it('persists publishedDate, doi and isbn into content_data', async () => {
    const card = await saveFullyPopulatedCard();

    const [row] = await db.select().from(cards);
    const metadata = (row!.contentData as any).metadata;

    // publishedDate was previously never written at all.
    expect(metadata.publishedDate).toBe(PUBLISHED_DATE.toISOString());
    expect(metadata.doi).toBe(DOI);
    expect(metadata.isbn).toBe(ISBN);
    expect(card).toBeDefined();
  });

  it('round-trips every metadata field back through the domain aggregate', async () => {
    const saved = await saveFullyPopulatedCard();

    const found = (await cardRepository.findById(saved.cardId)).unwrap();
    expect(found).not.toBeNull();

    const metadata = found!.content.urlContent!.metadata!;

    expect(metadata.title).toBe('A Research Paper');
    expect(metadata.description).toBe('An abstract');
    expect(metadata.author).toBe('A. Researcher');
    expect(metadata.siteName).toBe('Example Journal');
    expect(metadata.imageUrl).toBe('https://example.com/cover.png');
    expect(metadata.type).toBe(UrlType.RESEARCH);

    // The three fields that were previously lost.
    expect(metadata.publishedDate).toBeInstanceOf(Date);
    expect(metadata.publishedDate!.toISOString()).toBe(
      PUBLISHED_DATE.toISOString(),
    );
    expect(metadata.doi).toBe(DOI);
    expect(metadata.isbn).toBe(ISBN);
  });

  it('survives a load-modify-save cycle without dropping fields', async () => {
    // The old bug was asymmetric: doi/isbn were readable from the DB but lost
    // on reconstitution, so re-saving a loaded card silently blanked them.
    const saved = await saveFullyPopulatedCard();

    const loaded = (await cardRepository.findById(saved.cardId)).unwrap()!;
    (await cardRepository.save(loaded)).unwrap();

    const reloaded = (await cardRepository.findById(saved.cardId)).unwrap()!;
    const metadata = reloaded.content.urlContent!.metadata!;

    expect(metadata.publishedDate?.toISOString()).toBe(
      PUBLISHED_DATE.toISOString(),
    );
    expect(metadata.doi).toBe(DOI);
    expect(metadata.isbn).toBe(ISBN);
  });

  it('exposes publishedDate as a Date, never a raw string', async () => {
    // Regression for "metadata.publishedDate?.toISOString is not a function":
    // JSONB hands back an ISO string, which must be re-parsed on the way in.
    const saved = await saveFullyPopulatedCard();
    const loaded = (await cardRepository.findById(saved.cardId)).unwrap()!;
    const metadata = loaded.content.urlContent!.metadata!;

    expect(typeof metadata.publishedDate).not.toBe('string');
    expect(() => metadata.publishedDate!.toISOString()).not.toThrow();
  });
});
