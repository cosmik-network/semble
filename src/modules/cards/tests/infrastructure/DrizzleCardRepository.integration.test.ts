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
import { CardContent } from '../../domain/value-objects/CardContent';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { createTestSchema } from '../test-utils/createTestSchema';
import { Selector } from '../../domain/value-objects/selectors/Selector';
import { annotationSelectors } from '../../infrastructure/repositories/schema/annotationSelector.sql';

describe('DrizzleCardRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let cardRepository: DrizzleCardRepository;

  // Test data
  let curatorId: CuratorId;
  let anotherCuratorId: CuratorId;

  // Setup before all tests
  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:14').start();

    // Create database connection
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    // Create repository
    cardRepository = new DrizzleCardRepository(db);

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    anotherCuratorId = CuratorId.create('did:plc:anothercurator').unwrap();
  }, 60000); // Increase timeout for container startup

  // Cleanup after all tests
  afterAll(async () => {
    // Stop container
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  it('should save and retrieve a URL card', async () => {
    // Create a URL card
    const url = URL.create('https://example.com/article1').unwrap();
    const metadata = UrlMetadata.create({
      url: 'https://example.com/article1',
      title: 'Test Article',
      description: 'A test article',
      author: 'Test Author',
      siteName: 'Example Site',
      retrievedAt: new Date(),
    }).unwrap();

    const urlContent = CardContent.createUrlContent(url, metadata).unwrap();
    const cardType = CardType.create(CardTypeEnum.URL).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: urlContent,
      url,
    });

    expect(cardResult.isOk()).toBe(true);
    const card = cardResult.unwrap();

    // Save the card
    const saveResult = await cardRepository.save(card);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the card
    const retrievedResult = await cardRepository.findById(card.cardId);
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard).not.toBeNull();
    expect(retrievedCard?.cardId.getStringValue()).toBe(
      card.cardId.getStringValue(),
    );
    expect(retrievedCard?.content.type).toBe(CardTypeEnum.URL);
    expect(retrievedCard?.content.urlContent?.url.value).toBe(url.value);
    expect(retrievedCard?.content.urlContent?.metadata?.title).toBe(
      'Test Article',
    );
  });

  it('should save and retrieve a note card', async () => {
    // Create a note card
    const noteContent = CardContent.createNoteContent(
      'This is a test note',
    ).unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    });

    expect(cardResult.isOk()).toBe(true);
    const card = cardResult.unwrap();

    // Save the card
    const saveResult = await cardRepository.save(card);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the card
    const retrievedResult = await cardRepository.findById(card.cardId);
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard).not.toBeNull();
    expect(retrievedCard?.content.type).toBe(CardTypeEnum.NOTE);
    expect(retrievedCard?.content.noteContent?.text).toBe(
      'This is a test note',
    );
  });

  it('should save and retrieve a card with library memberships', async () => {
    // Create a note card
    const noteContent = CardContent.createNoteContent(
      'Card with library memberships',
    ).unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    });

    expect(cardResult.isOk()).toBe(true);
    const card = cardResult.unwrap();

    // Add the card to two different libraries
    const addResult1 = card.addToLibrary(curatorId);
    expect(addResult1.isOk()).toBe(true);

    const addResult2 = card.addToLibrary(anotherCuratorId);
    expect(addResult2.isOk()).toBe(true);

    // Save the card
    const saveResult = await cardRepository.save(card);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the card
    const retrievedResult = await cardRepository.findById(card.cardId);
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard).not.toBeNull();
    expect(retrievedCard?.libraryMemberships).toHaveLength(2);

    const membershipUserIds = retrievedCard?.libraryMemberships.map(
      (m) => m.curatorId.value,
    );
    expect(membershipUserIds).toContain(curatorId.value);
    expect(membershipUserIds).toContain(anotherCuratorId.value);
  });

  it('should update library memberships when card is saved', async () => {
    // Create a note card
    const noteContent = CardContent.createNoteContent(
      'Card for membership updates',
    ).unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    });

    const card = cardResult.unwrap();

    // Add to one library and save
    card.addToLibrary(curatorId);
    await cardRepository.save(card);

    // Verify one membership
    let retrievedResult = await cardRepository.findById(card.cardId);
    let retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard?.libraryMemberships).toHaveLength(1);

    // Add to another library and save
    card.addToLibrary(anotherCuratorId);
    await cardRepository.save(card);

    // Verify two memberships
    retrievedResult = await cardRepository.findById(card.cardId);
    retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard?.libraryMemberships).toHaveLength(2);

    // Remove from one library and save
    card.removeFromLibrary(curatorId);
    await cardRepository.save(card);

    // Verify one membership remains
    retrievedResult = await cardRepository.findById(card.cardId);
    retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard?.libraryMemberships).toHaveLength(1);
    expect(retrievedCard?.libraryMemberships[0]!.curatorId.value).toBe(
      anotherCuratorId.value,
    );
  });

  it('should delete a card and its library memberships', async () => {
    // Create a card
    const noteContent =
      CardContent.createNoteContent('Card to delete').unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    });

    const card = cardResult.unwrap();

    // Add to libraries
    card.addToLibrary(curatorId);
    card.addToLibrary(anotherCuratorId);

    await cardRepository.save(card);

    // Verify card and memberships exist
    let retrievedResult = await cardRepository.findById(card.cardId);
    expect(retrievedResult.unwrap()?.libraryMemberships).toHaveLength(2);

    // Delete the card
    const deleteResult = await cardRepository.delete(card.cardId);
    expect(deleteResult.isOk()).toBe(true);

    // Try to retrieve the deleted card
    retrievedResult = await cardRepository.findById(card.cardId);
    expect(retrievedResult.isOk()).toBe(true);
    expect(retrievedResult.unwrap()).toBeNull();
  });

  it('should return null when card is not found', async () => {
    const noteContent =
      CardContent.createNoteContent('Non-existent card').unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const nonExistentCardId = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    }).unwrap().cardId;

    const result = await cardRepository.findById(nonExistentCardId);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  it('should handle publishedRecordId when marking card as published', async () => {
    // Create a note card
    const noteContent = CardContent.createNoteContent(
      'Card for publishing test',
    ).unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    });

    const card = cardResult.unwrap();

    // Add to library
    card.addToLibrary(curatorId);

    // Mark as published - this should set the publishedRecordId
    const publishedRecordId = {
      uri: 'at://did:plc:testcurator/network.cosmik.card/test123',
      cid: 'bafytest123',
    };

    const publishedRecord = PublishedRecordId.create(publishedRecordId);

    const markResult = card.markCardInLibraryAsPublished(
      curatorId,
      publishedRecord,
    );
    expect(markResult.isOk()).toBe(true);

    // Verify publishedRecordId is set in memory
    expect(card.publishedRecordId).toBeDefined();
    expect(card.publishedRecordId?.uri).toBe(publishedRecordId.uri);
    expect(card.publishedRecordId?.cid).toBe(publishedRecordId.cid);

    // Save the card - this should persist the publishedRecordId
    const saveResult = await cardRepository.save(card);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve and verify the publishedRecordId persisted
    const retrievedResult = await cardRepository.findById(card.cardId);
    const retrievedCard = retrievedResult.unwrap();

    expect(retrievedCard?.publishedRecordId).toBeDefined();
    expect(retrievedCard?.publishedRecordId?.uri).toBe(publishedRecordId.uri);
    expect(retrievedCard?.publishedRecordId?.cid).toBe(publishedRecordId.cid);
  });

  it('should find URL card by URL', async () => {
    // Create a URL card
    const url = URL.create('https://example.com/findme').unwrap();
    const metadata = UrlMetadata.create({
      url: 'https://example.com/findme',
      title: 'Findable Article',
      description: 'An article that can be found',
      retrievedAt: new Date(),
    }).unwrap();

    const urlContent = CardContent.createUrlContent(url, metadata).unwrap();
    const cardType = CardType.create(CardTypeEnum.URL).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: urlContent,
      url,
    });

    const card = cardResult.unwrap();

    // Save the card
    await cardRepository.save(card);

    // Find the card by URL
    const foundResult = await cardRepository.findUsersUrlCardByUrl(
      url,
      curatorId,
    );
    expect(foundResult.isOk()).toBe(true);

    const foundCard = foundResult.unwrap();
    expect(foundCard).not.toBeNull();
    expect(foundCard?.cardId.getStringValue()).toBe(
      card.cardId.getStringValue(),
    );
    expect(foundCard?.content.type).toBe(CardTypeEnum.URL);
    expect(foundCard?.content.urlContent?.url.value).toBe(url.value);
  });

  it('should return null when URL card is not found', async () => {
    const nonExistentUrl = URL.create('https://example.com/notfound').unwrap();

    const result = await cardRepository.findUsersUrlCardByUrl(
      nonExistentUrl,
      curatorId,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  it('should not find note cards when searching by URL', async () => {
    // Create a note card with a URL (but it's not a URL card type)
    const url = URL.create('https://example.com/note-url').unwrap();
    const noteContent =
      CardContent.createNoteContent('Note about a URL').unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
      url, // Note cards can have URLs too
    });

    const card = cardResult.unwrap();
    await cardRepository.save(card);

    // Try to find it as a URL card - should return null because it's a NOTE type
    const foundResult = await cardRepository.findUsersUrlCardByUrl(
      url,
      curatorId,
    );
    expect(foundResult.isOk()).toBe(true);
    expect(foundResult.unwrap()).toBeNull();
  });

  it('should maintain accurate libraryCount when adding and removing from libraries', async () => {
    // Create a note card
    const noteContent = CardContent.createNoteContent(
      'Card for library count test',
    ).unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
    });

    const card = cardResult.unwrap();

    // Initially should have 0 library count
    expect(card.libraryCount).toBe(0);

    // Add to one library
    card.addToLibrary(curatorId);
    expect(card.libraryCount).toBe(1);
    await cardRepository.save(card);

    // Retrieve and verify library count persisted
    let retrievedResult = await cardRepository.findById(card.cardId);
    let retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard?.libraryCount).toBe(1);
    expect(retrievedCard?.libraryMemberships).toHaveLength(1);

    // Add to another library
    card.addToLibrary(anotherCuratorId);
    expect(card.libraryCount).toBe(2);
    await cardRepository.save(card);

    // Retrieve and verify library count updated
    retrievedResult = await cardRepository.findById(card.cardId);
    retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard?.libraryCount).toBe(2);
    expect(retrievedCard?.libraryMemberships).toHaveLength(2);

    // Remove from one library
    card.removeFromLibrary(curatorId);
    expect(card.libraryCount).toBe(1);
    await cardRepository.save(card);

    // Retrieve and verify library count decreased
    retrievedResult = await cardRepository.findById(card.cardId);
    retrievedCard = retrievedResult.unwrap();
    expect(retrievedCard?.libraryCount).toBe(1);
    expect(retrievedCard?.libraryMemberships).toHaveLength(1);
    expect(retrievedCard?.libraryMemberships[0]!.curatorId.value).toBe(
      anotherCuratorId.value,
    );
  });

  it('should initialize libraryCount correctly when creating card with existing memberships', async () => {
    // Create a note card with initial library memberships
    const noteContent = CardContent.createNoteContent(
      'Card with initial memberships',
    ).unwrap();
    const cardType = CardType.create(CardTypeEnum.NOTE).unwrap();

    const initialMemberships = [
      {
        curatorId: curatorId,
        addedAt: new Date(),
      },
      {
        curatorId: anotherCuratorId,
        addedAt: new Date(),
      },
    ];

    const cardResult = Card.create({
      curatorId,
      type: cardType,
      content: noteContent,
      libraryMemberships: initialMemberships,
    });

    const card = cardResult.unwrap();

    // Should automatically set libraryCount to match memberships length
    expect(card.libraryCount).toBe(2);
    expect(card.libraryMemberships).toHaveLength(2);

    // Save and retrieve to verify persistence
    await cardRepository.save(card);
    const retrievedResult = await cardRepository.findById(card.cardId);
    const retrievedCard = retrievedResult.unwrap();

    expect(retrievedCard?.libraryCount).toBe(2);
    expect(retrievedCard?.libraryMemberships).toHaveLength(2);
  });

  describe('annotation cards', () => {
    const ANNOTATION_URL = 'https://example.com/annotated';

    const makeAnnotationCard = (exact: string, note?: string): Card => {
      const selector = Selector.createTextQuote({
        exact,
        prefix: 'before ',
        suffix: ' after',
      }).unwrap();
      const content = CardContent.createAnnotationContent(
        [selector],
        note,
      ).unwrap();
      const url = URL.create(ANNOTATION_URL).unwrap();

      return Card.create({
        curatorId,
        type: CardType.create(CardTypeEnum.ANNOTATION).unwrap(),
        content,
        url,
      }).unwrap();
    };

    it('should save and retrieve an annotation card with note and selector', async () => {
      const card = makeAnnotationCard(
        'the quoted passage',
        'this claim needs a source',
      );

      const saveResult = await cardRepository.save(card);
      expect(saveResult.isOk()).toBe(true);

      const retrievedResult = await cardRepository.findById(card.cardId);
      expect(retrievedResult.isOk()).toBe(true);

      const retrievedCard = retrievedResult.unwrap();
      expect(retrievedCard?.type.value).toBe(CardTypeEnum.ANNOTATION);
      expect(retrievedCard?.url?.value).toBe(ANNOTATION_URL);

      const annotationContent = retrievedCard?.content.annotationContent;
      expect(annotationContent?.note).toBe('this claim needs a source');

      const textQuote = annotationContent?.textQuoteSelector;
      expect(textQuote?.exact).toBe('the quoted passage');
      expect(textQuote?.prefix).toBe('before ');
      expect(textQuote?.suffix).toBe(' after');
    });

    it('should persist exact_normalized alongside the raw exact', async () => {
      const card = makeAnnotationCard('passage\n\nspanning blocks');

      await cardRepository.save(card);

      const rows = await db
        .select({
          exact: annotationSelectors.exact,
          exactNormalized: annotationSelectors.exactNormalized,
        })
        .from(annotationSelectors);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.exact).toBe('passage\n\nspanning blocks');
      expect(rows[0]!.exactNormalized).toBe('passage spanning blocks');
    });

    it('should save an annotation without a note', async () => {
      const card = makeAnnotationCard('just a passage');

      const saveResult = await cardRepository.save(card);
      expect(saveResult.isOk()).toBe(true);

      const retrieved = (await cardRepository.findById(card.cardId)).unwrap();
      expect(retrieved?.content.annotationContent?.note).toBeUndefined();
      expect(retrieved?.content.annotationContent?.selectors).toHaveLength(1);
    });

    it('should resync selector rows when an annotation is updated', async () => {
      const card = makeAnnotationCard('original passage', 'old note');

      await cardRepository.save(card);

      const selectorCountAfterFirstSave = await db
        .select({ id: annotationSelectors.id })
        .from(annotationSelectors);
      expect(selectorCountAfterFirstSave).toHaveLength(1);

      // Save again — selectors should be replaced, not duplicated
      await cardRepository.save(card);

      const rows = await db
        .select({ id: annotationSelectors.id })
        .from(annotationSelectors);
      expect(rows).toHaveLength(1);
    });

    it("should find all of a user's annotation cards for a url", async () => {
      const first = makeAnnotationCard('first passage', 'note one');
      const second = makeAnnotationCard('second passage');
      // Another curator\'s annotation on the same url — must not match
      const otherCurators = Card.create({
        curatorId: anotherCuratorId,
        type: CardType.create(CardTypeEnum.ANNOTATION).unwrap(),
        content: CardContent.createAnnotationContent([
          Selector.createTextQuote({ exact: 'someone else' }).unwrap(),
        ]).unwrap(),
        url: URL.create(ANNOTATION_URL).unwrap(),
      }).unwrap();

      await cardRepository.save(first);
      await cardRepository.save(second);
      await cardRepository.save(otherCurators);

      const found = await cardRepository.findUsersAnnotationCardsByUrl(
        URL.create(ANNOTATION_URL).unwrap(),
        curatorId,
      );

      expect(found.isOk()).toBe(true);
      const annotationCards = found.unwrap();
      expect(annotationCards).toHaveLength(2);

      const exacts = annotationCards
        .map((c) => c.content.annotationContent?.textQuoteSelector?.exact)
        .sort();
      expect(exacts).toEqual(['first passage', 'second passage']);
      expect(annotationCards.every((c) => c.curatorId.equals(curatorId))).toBe(
        true,
      );
    });
  });
});
