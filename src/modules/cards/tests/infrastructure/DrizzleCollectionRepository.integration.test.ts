import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCollectionRepository } from '../../infrastructure/repositories/DrizzleCollectionRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import {
  collections,
  collectionCollaborators,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { Collection, CollectionAccessType } from '../../domain/Collection';
import { CardFactory } from '../../domain/CardFactory';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { createTestSchema } from '../test-utils/createTestSchema';

describe('DrizzleCollectionRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let collectionRepository: DrizzleCollectionRepository;
  let cardRepository: DrizzleCardRepository;

  // Test data
  let curatorId: CuratorId;
  let collaboratorId: CuratorId;

  // Setup before all tests
  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:14').start();

    // Create database connection
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    // Create repositories
    collectionRepository = new DrizzleCollectionRepository(db);
    cardRepository = new DrizzleCardRepository(db);

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    collaboratorId = CuratorId.create('did:plc:collaborator').unwrap();
  }, 60000); // Increase timeout for container startup

  // Cleanup after all tests
  afterAll(async () => {
    // Stop container
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(collectionCards);
    await db.delete(collectionCollaborators);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  it('should save and retrieve a collection', async () => {
    // Create a collection
    const collectionId = new UniqueEntityID();

    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Test Collection',
        description: 'A test collection',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    // Save the collection
    const saveResult = await collectionRepository.save(collection);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCollection = retrievedResult.unwrap();
    expect(retrievedCollection).not.toBeNull();
    expect(retrievedCollection?.collectionId.getStringValue()).toBe(
      collectionId.toString(),
    );
    expect(retrievedCollection?.authorId.value).toBe(curatorId.value);
    expect(retrievedCollection?.name.value).toBe('Test Collection');
    expect(retrievedCollection?.description?.value).toBe('A test collection');
    expect(retrievedCollection?.accessType).toBe(CollectionAccessType.OPEN);
  });

  it('should save and retrieve a collection with collaborators', async () => {
    // Create a collection
    const collectionId = new UniqueEntityID();

    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Collaborative Collection',
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    // Add a collaborator
    const addCollaboratorResult = collection.addCollaborator(
      collaboratorId,
      curatorId,
    );
    expect(addCollaboratorResult.isOk()).toBe(true);

    // Save the collection
    const saveResult = await collectionRepository.save(collection);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCollection = retrievedResult.unwrap();
    expect(retrievedCollection).not.toBeNull();
    expect(retrievedCollection?.collaboratorIds).toHaveLength(1);
    expect(retrievedCollection?.collaboratorIds[0]?.value).toBe(
      collaboratorId.value,
    );
  });

  it('should save and retrieve a collection with cards', async () => {
    // Create a card first
    const cardResult = CardFactory.create({
      curatorId: curatorId.value,
      cardInput: {
        type: CardTypeEnum.NOTE,
        text: 'Test card for collection',
      },
    });

    const card = cardResult.unwrap();
    await cardRepository.save(card);

    // Create a collection
    const collectionId = new UniqueEntityID();

    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Collection with Cards',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    // Add the card to the collection
    const addCardResult = collection.addCard(card.cardId, curatorId);
    expect(addCardResult.isOk()).toBe(true);

    // Save the collection
    const saveResult = await collectionRepository.save(collection);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCollection = retrievedResult.unwrap();
    expect(retrievedCollection).not.toBeNull();
    expect(retrievedCollection?.cardLinks).toHaveLength(1);
    expect(retrievedCollection?.cardLinks[0]?.cardId.getStringValue()).toBe(
      card.cardId.getStringValue(),
    );
    expect(retrievedCollection?.cardLinks[0]?.addedBy.value).toBe(
      curatorId.value,
    );
  });

  it('should update an existing collection', async () => {
    // Create a collection
    const collectionId = new UniqueEntityID();

    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Original Name',
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    await collectionRepository.save(collection);

    // Update the collection
    const updatedCollection = Collection.create(
      {
        authorId: curatorId,
        name: 'Updated Name',
        description: 'Updated description',
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    await collectionRepository.save(updatedCollection);

    // Retrieve the updated collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    const retrievedCollection = retrievedResult.unwrap();

    expect(retrievedCollection).not.toBeNull();
    expect(retrievedCollection?.name.value).toBe('Updated Name');
    expect(retrievedCollection?.description?.value).toBe('Updated description');
  });

  it('should delete a collection', async () => {
    // Create a collection
    const collectionId = new UniqueEntityID();

    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Collection to Delete',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    await collectionRepository.save(collection);

    // Delete the collection
    const deleteResult = await collectionRepository.delete(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(deleteResult.isOk()).toBe(true);

    // Try to retrieve the deleted collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(retrievedResult.isOk()).toBe(true);
    expect(retrievedResult.unwrap()).toBeNull();
  });

  it('should find collections by curator ID', async () => {
    // Create multiple collections for the same curator
    const collection1Id = new UniqueEntityID();
    const collection1 = Collection.create(
      {
        authorId: curatorId,
        name: 'First Collection',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection1Id,
    ).unwrap();

    const collection2Id = new UniqueEntityID();
    const collection2 = Collection.create(
      {
        authorId: curatorId,
        name: 'Second Collection',
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection2Id,
    ).unwrap();

    await collectionRepository.save(collection1);
    await collectionRepository.save(collection2);

    // Find collections by curator ID
    const foundCollectionsResult =
      await collectionRepository.findByCuratorId(curatorId);
    expect(foundCollectionsResult.isOk()).toBe(true);

    const foundCollections = foundCollectionsResult.unwrap();
    expect(foundCollections).toHaveLength(2);

    const names = foundCollections.map((c) => c.name.value);
    expect(names).toContain('First Collection');
    expect(names).toContain('Second Collection');
  });

  it('should find collections by card ID', async () => {
    // Create a card
    const cardResult = CardFactory.create({
      curatorId: curatorId.value,
      cardInput: {
        type: CardTypeEnum.NOTE,
        text: 'Shared card',
      },
    });

    const card = cardResult.unwrap();
    await cardRepository.save(card);

    // Create multiple collections and add the card to them
    const collection1Id = new UniqueEntityID();
    const collection1 = Collection.create(
      {
        authorId: curatorId,
        name: 'Collection One',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection1Id,
    ).unwrap();

    const collection2Id = new UniqueEntityID();
    const collection2 = Collection.create(
      {
        authorId: curatorId,
        name: 'Collection Two',
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection2Id,
    ).unwrap();

    // Add card to both collections
    collection1.addCard(card.cardId, curatorId);
    collection2.addCard(card.cardId, curatorId);

    await collectionRepository.save(collection1);
    await collectionRepository.save(collection2);

    // Find collections by card ID
    const foundCollectionsResult = await collectionRepository.findByCardId(
      card.cardId,
    );
    expect(foundCollectionsResult.isOk()).toBe(true);

    const foundCollections = foundCollectionsResult.unwrap();
    expect(foundCollections).toHaveLength(2);

    const names = foundCollections.map((c) => c.name.value);
    expect(names).toContain('Collection One');
    expect(names).toContain('Collection Two');
  });

  it('should save and retrieve a collection with published record', async () => {
    // Create a collection
    const collectionId = new UniqueEntityID();

    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Published Collection',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    // Mark as published
    const publishedRecordId = PublishedRecordId.create({
      uri: 'at://did:plc:testcurator/network.cosmik.collection/1234',
      cid: 'bafyreihgmyh2srmmyj7g7vmah3ietpwdwcgda2jof7hkfxmcbbjwejnqwu',
    });

    collection.markAsPublished(publishedRecordId);

    // Save the collection
    const saveResult = await collectionRepository.save(collection);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCollection = retrievedResult.unwrap();
    expect(retrievedCollection).not.toBeNull();
    expect(retrievedCollection?.publishedRecordId?.uri).toBe(
      'at://did:plc:testcurator/network.cosmik.collection/1234',
    );
    expect(retrievedCollection?.publishedRecordId?.cid).toBe(
      'bafyreihgmyh2srmmyj7g7vmah3ietpwdwcgda2jof7hkfxmcbbjwejnqwu',
    );
  });

  it('should handle card links with published records', async () => {
    // Create a card
    const cardResult = CardFactory.create({
      curatorId: curatorId.value,
      cardInput: {
        type: CardTypeEnum.NOTE,
        text: 'Card with published link',
      },
    });

    const card = cardResult.unwrap();
    await cardRepository.save(card);

    // Create a collection
    const collectionId = new UniqueEntityID();
    const collection = Collection.create(
      {
        authorId: curatorId,
        name: 'Collection with Published Links',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collectionId,
    ).unwrap();

    // Add card to collection
    collection.addCard(card.cardId, curatorId);

    // Mark the card link as published
    const linkPublishedRecord = PublishedRecordId.create({
      uri: 'at://did:plc:testcurator/network.cosmik.collectionLink/5678',
      cid: 'bafyreihgmyh2srmmyj7g7vmah3ietpwdwcgda2jof7hkfxmcbbjwejnqwu',
    });

    collection.markCardLinkAsPublished(card.cardId, linkPublishedRecord);

    // Save the collection
    const saveResult = await collectionRepository.save(collection);
    expect(saveResult.isOk()).toBe(true);

    // Retrieve the collection
    const retrievedResult = await collectionRepository.findById(
      CollectionId.create(collectionId).unwrap(),
    );
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedCollection = retrievedResult.unwrap();
    expect(retrievedCollection).not.toBeNull();
    expect(retrievedCollection?.cardLinks).toHaveLength(1);
    expect(retrievedCollection?.cardLinks[0]?.publishedRecordId?.uri).toBe(
      'at://did:plc:testcurator/network.cosmik.collectionLink/5678',
    );
  });

  it('should find collections by author ID containing a specific card', async () => {
    // Create a card
    const cardResult = CardFactory.create({
      curatorId: curatorId.value,
      cardInput: {
        type: CardTypeEnum.NOTE,
        text: 'Shared card for author test',
      },
    });

    const card = cardResult.unwrap();
    await cardRepository.save(card);

    // Create collections by the same author
    const collection1Id = new UniqueEntityID();
    const collection1 = Collection.create(
      {
        authorId: curatorId,
        name: 'Author Collection One',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection1Id,
    ).unwrap();

    const collection2Id = new UniqueEntityID();
    const collection2 = Collection.create(
      {
        authorId: curatorId,
        name: 'Author Collection Two',
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection2Id,
    ).unwrap();

    // Create a collection by a different author
    const collection3Id = new UniqueEntityID();
    const collection3 = Collection.create(
      {
        authorId: collaboratorId,
        name: 'Different Author Collection',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection3Id,
    ).unwrap();

    // Add card to all collections
    collection1.addCard(card.cardId, curatorId);
    collection2.addCard(card.cardId, curatorId);
    collection3.addCard(card.cardId, collaboratorId);

    await collectionRepository.save(collection1);
    await collectionRepository.save(collection2);
    await collectionRepository.save(collection3);

    // Find collections by the original curator containing this card
    const foundCollectionsResult =
      await collectionRepository.findByCuratorIdContainingCard(
        curatorId,
        card.cardId,
      );
    expect(foundCollectionsResult.isOk()).toBe(true);

    const foundCollections = foundCollectionsResult.unwrap();
    expect(foundCollections).toHaveLength(2);

    const names = foundCollections.map((c) => c.name.value);
    expect(names).toContain('Author Collection One');
    expect(names).toContain('Author Collection Two');
    expect(names).not.toContain('Different Author Collection');

    // Verify all returned collections are authored by the correct curator
    foundCollections.forEach((collection) => {
      expect(collection.authorId.value).toBe(curatorId.value);
    });
  });

  it('should find collections containing a card added by a specific user', async () => {
    // Create a card
    const cardResult = CardFactory.create({
      curatorId: curatorId.value,
      cardInput: {
        type: CardTypeEnum.NOTE,
        text: 'Card added by different users',
      },
    });

    const card = cardResult.unwrap();
    await cardRepository.save(card);

    // Collection 1: Owned by collaboratorId, card added by curatorId
    const collection1Id = new UniqueEntityID();
    const collection1 = Collection.create(
      {
        authorId: collaboratorId,
        name: 'Collection Owned By Collaborator',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection1Id,
    ).unwrap();

    // curatorId adds card to collaborator's collection
    collection1.addCard(card.cardId, curatorId);

    // Collection 2: Owned by collaboratorId, card added by collaboratorId
    const collection2Id = new UniqueEntityID();
    const collection2 = Collection.create(
      {
        authorId: collaboratorId,
        name: 'Collection With Card Added By Collaborator',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection2Id,
    ).unwrap();

    // collaboratorId adds card to their own collection
    collection2.addCard(card.cardId, collaboratorId);

    // Collection 3: Owned by curatorId, card added by curatorId
    const collection3Id = new UniqueEntityID();
    const collection3 = Collection.create(
      {
        authorId: curatorId,
        name: 'Collection Owned And Added By Curator',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collection3Id,
    ).unwrap();

    // curatorId adds card to their own collection
    collection3.addCard(card.cardId, curatorId);

    await collectionRepository.save(collection1);
    await collectionRepository.save(collection2);
    await collectionRepository.save(collection3);

    // Find collections where curatorId added the card
    const foundCollectionsResult =
      await collectionRepository.findContainingCardAddedBy(
        card.cardId,
        curatorId,
      );
    expect(foundCollectionsResult.isOk()).toBe(true);

    const foundCollections = foundCollectionsResult.unwrap();
    expect(foundCollections).toHaveLength(2);

    const names = foundCollections.map((c) => c.name.value);
    expect(names).toContain('Collection Owned By Collaborator');
    expect(names).toContain('Collection Owned And Added By Curator');
    expect(names).not.toContain('Collection With Card Added By Collaborator');

    // Verify that collections where curatorId added the card are returned
    // regardless of who owns the collection
    foundCollections.forEach((collection) => {
      const cardLink = collection.cardLinks.find((link) =>
        link.cardId.equals(card.cardId),
      );
      expect(cardLink).toBeDefined();
      expect(cardLink?.addedBy.value).toBe(curatorId.value);
    });
  });
});
