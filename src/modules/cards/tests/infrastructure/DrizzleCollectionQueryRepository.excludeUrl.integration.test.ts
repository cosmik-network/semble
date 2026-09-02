import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCollectionQueryRepository } from '../../infrastructure/repositories/DrizzleCollectionQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCollectionRepository } from '../../infrastructure/repositories/DrizzleCollectionRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { URL } from '../../domain/value-objects/URL';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { CollectionAccessType } from '../../domain/Collection';

/**
 * Covers the `excludeUrl` anti-join used to keep already-containing
 * collections out of recommendations.
 */
describe('DrizzleCollectionQueryRepository - excludeUrl filtering', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCollectionQueryRepository;
  let cardRepository: DrizzleCardRepository;
  let collectionRepository: DrizzleCollectionRepository;

  let curator1: CuratorId;
  let curator2: CuratorId;

  // The URL being recommended for
  const TARGET_URL = 'https://example.com/target-article';
  // A semantically similar URL that seeds the recommendation
  const SIMILAR_URL = 'https://example.com/similar-article';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();

    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    queryRepository = new DrizzleCollectionQueryRepository(db);
    cardRepository = new DrizzleCardRepository(db);
    collectionRepository = new DrizzleCollectionRepository(db);

    await createTestSchema(db);

    curator1 = CuratorId.create('did:plc:curator1').unwrap();
    curator2 = CuratorId.create('did:plc:curator2').unwrap();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(collectionCards);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  /**
   * Builds two collections for the given author: one holding only the similar
   * URL, one holding the similar URL *and* the target URL.
   */
  async function seedCollections(
    curator: CuratorId,
    accessType: CollectionAccessType,
  ) {
    const similarUrl = URL.create(SIMILAR_URL).unwrap();
    const targetUrl = URL.create(TARGET_URL).unwrap();

    const similarCardA = new CardBuilder()
      .withCuratorId(curator.value)
      .withType(CardTypeEnum.URL)
      .withUrl(similarUrl)
      .buildOrThrow();
    const similarCardB = new CardBuilder()
      .withCuratorId(curator.value)
      .withType(CardTypeEnum.URL)
      .withUrl(similarUrl)
      .buildOrThrow();
    const targetCard = new CardBuilder()
      .withCuratorId(curator.value)
      .withType(CardTypeEnum.URL)
      .withUrl(targetUrl)
      .buildOrThrow();

    await cardRepository.save(similarCardA);
    await cardRepository.save(similarCardB);
    await cardRepository.save(targetCard);

    const eligible = new CollectionBuilder()
      .withAuthorId(curator.value)
      .withName('Eligible')
      .withAccessType(accessType)
      .buildOrThrow();
    eligible.addCard(similarCardA.cardId, curator);

    const alreadyHasTarget = new CollectionBuilder()
      .withAuthorId(curator.value)
      .withName('Already Has Target')
      .withAccessType(accessType)
      .buildOrThrow();
    alreadyHasTarget.addCard(similarCardB.cardId, curator);
    alreadyHasTarget.addCard(targetCard.cardId, curator);

    await collectionRepository.save(eligible);
    await collectionRepository.save(alreadyHasTarget);

    return { eligible, alreadyHasTarget };
  }

  describe('getCollectionsForUrlsByAuthor', () => {
    it('returns both collections when no excludeUrl is given', async () => {
      const { eligible, alreadyHasTarget } = await seedCollections(
        curator1,
        CollectionAccessType.CLOSED,
      );

      const result = await queryRepository.getCollectionsForUrlsByAuthor(
        [SIMILAR_URL],
        curator1.value,
      );

      const ids = result.map((c) => c.id);
      expect(ids).toContain(eligible.collectionId.getStringValue());
      expect(ids).toContain(alreadyHasTarget.collectionId.getStringValue());
    });

    it('excludes collections that already contain the target URL', async () => {
      const { eligible, alreadyHasTarget } = await seedCollections(
        curator1,
        CollectionAccessType.CLOSED,
      );

      const result = await queryRepository.getCollectionsForUrlsByAuthor(
        [SIMILAR_URL],
        curator1.value,
        TARGET_URL,
      );

      const ids = result.map((c) => c.id);
      expect(ids).toContain(eligible.collectionId.getStringValue());
      expect(ids).not.toContain(alreadyHasTarget.collectionId.getStringValue());
    });

    it('still reports matched URLs on the surviving collections', async () => {
      await seedCollections(curator1, CollectionAccessType.CLOSED);

      const result = await queryRepository.getCollectionsForUrlsByAuthor(
        [SIMILAR_URL],
        curator1.value,
        TARGET_URL,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.matchedUrls).toEqual([SIMILAR_URL]);
    });
  });

  describe('getOpenCollectionsForUrls', () => {
    it('excludes collections that already contain the target URL', async () => {
      const { eligible, alreadyHasTarget } = await seedCollections(
        curator2,
        CollectionAccessType.OPEN,
      );

      const result = await queryRepository.getOpenCollectionsForUrls(
        [SIMILAR_URL],
        curator1.value, // exclude the calling user's own collections
        TARGET_URL,
      );

      const ids = result.map((c) => c.id);
      expect(ids).toContain(eligible.collectionId.getStringValue());
      expect(ids).not.toContain(alreadyHasTarget.collectionId.getStringValue());
    });

    it('excludes based on the URL regardless of who added the card', async () => {
      // curator2 owns an OPEN collection; curator1 contributes the target URL
      // to it. It should still be excluded.
      const similarUrl = URL.create(SIMILAR_URL).unwrap();
      const targetUrl = URL.create(TARGET_URL).unwrap();

      const similarCard = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(similarUrl)
        .buildOrThrow();
      const targetCard = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(targetUrl)
        .buildOrThrow();

      await cardRepository.save(similarCard);
      await cardRepository.save(targetCard);

      const collection = new CollectionBuilder()
        .withAuthorId(curator2.value)
        .withName('Open Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();
      collection.addCard(similarCard.cardId, curator2);
      collection.addCard(targetCard.cardId, curator1);
      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsForUrls(
        [SIMILAR_URL],
        curator1.value,
        TARGET_URL,
      );

      expect(result).toHaveLength(0);
    });
  });
});
