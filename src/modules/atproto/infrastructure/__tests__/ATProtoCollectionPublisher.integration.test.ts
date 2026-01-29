import { ATProtoCollectionPublisher } from '../publishers/ATProtoCollectionPublisher';
import { FakeCardPublisher } from 'src/modules/cards/tests/utils/FakeCardPublisher';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { CollectionBuilder } from 'src/modules/cards/tests/utils/builders/CollectionBuilder';
import { CardBuilder } from 'src/modules/cards/tests/utils/builders/CardBuilder';
import { CollectionAccessType } from 'src/modules/cards/domain/Collection';
import { URL } from 'src/modules/cards/domain/value-objects/URL';
import { UrlMetadata } from 'src/modules/cards/domain/value-objects/UrlMetadata';
import { CuratorId } from 'src/modules/cards/domain/value-objects/CuratorId';
import dotenv from 'dotenv';
import { AppPasswordAgentService } from './AppPasswordAgentService';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Set to false to skip unpublishing (useful for debugging published records)
const UNPUBLISH = true;

describe.skip('ATProtoCollectionPublisher', () => {
  let collectionPublisher: ATProtoCollectionPublisher;
  let cardPublisher: FakeCardPublisher;
  let curatorId: CuratorId;
  let publishedCollectionIds: PublishedRecordId[] = [];
  let publishedLinkIds: PublishedRecordId[] = [];
  const envConfig: EnvironmentConfigService = new EnvironmentConfigService();

  beforeAll(async () => {
    if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
      throw new Error(
        'BSKY_DID and BSKY_APP_PASSWORD must be set in .env.test',
      );
    }

    const agentService = new AppPasswordAgentService({
      did: process.env.BSKY_DID,
      password: process.env.BSKY_APP_PASSWORD,
    });

    const collections = envConfig.getAtProtoConfig().collections;
    collectionPublisher = new ATProtoCollectionPublisher(
      agentService,
      collections.collection,
      collections.collectionLink,
      collections.marginCollection,
      collections.marginCollectionItem,
    );
    cardPublisher = new FakeCardPublisher();
    curatorId = CuratorId.create(process.env.BSKY_DID).unwrap();
  });

  afterAll(async () => {
    // Skip cleanup if credentials are not available or UNPUBLISH is false
    if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD || !UNPUBLISH) {
      if (!UNPUBLISH) {
        console.log('Skipping cleanup: UNPUBLISH is set to false');
      }
      return;
    }

    // Clean up all published collections
    for (const collectionId of publishedCollectionIds) {
      try {
        await collectionPublisher.unpublish(collectionId);
        console.log(`Cleaned up collection: ${collectionId.getValue().uri}`);
      } catch (error) {
        console.warn(`Failed to clean up collection: ${error}`);
      }
    }

    // Clean up all published collection links
    for (const linkId of publishedLinkIds) {
      try {
        await collectionPublisher.unpublishCardAddedToCollection(linkId);
        console.log(`Cleaned up collection link: ${linkId.getValue().uri}`);
      } catch (error) {
        console.warn(`Failed to clean up collection link: ${error}`);
      }
    }

    // Clear fake card publisher
    cardPublisher.clear();
  });

  describe('Collection Publishing', () => {
    it('should publish and unpublish an empty collection', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      // Create an empty collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .withDescription('A test collection for publishing')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // 1. Publish the collection
      const publishResult = await collectionPublisher.publish(collection);
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const collectionRecordId = publishResult.value;
        publishedCollectionIds.push(collectionRecordId);

        console.log(
          `Published empty collection: ${collectionRecordId.getValue().uri}`,
        );

        // Mark collection as published
        collection.markAsPublished(collectionRecordId);
        expect(collection.isPublished).toBe(true);

        // 2. Test updating the collection
        const updateResult = await collectionPublisher.publish(collection);
        expect(updateResult.isOk()).toBe(true);

        if (updateResult.isOk()) {
          expect(updateResult.value).toBe(collectionRecordId);
          console.log(
            `Updated collection: ${collectionRecordId.getValue().uri}`,
          );
        }

        // 3. Unpublish the collection
        if (UNPUBLISH) {
          const unpublishResult =
            await collectionPublisher.unpublish(collectionRecordId);
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished empty collection');

          // Remove from cleanup list since we've already unpublished it
          publishedCollectionIds = publishedCollectionIds.filter(
            (id) => id !== collectionRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 15000);

    it('should publish a collection with cards and collection links', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      // 1. Create and publish some cards first
      const testUrl1 = URL.create('https://example.com/article1').unwrap();
      const metadata1 = UrlMetadata.create({
        url: testUrl1.value,
        title: 'Test Article 1',
        description: 'First test article',
        retrievedAt: new Date(),
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(testUrl1, metadata1)
        .withUrl(testUrl1)
        .withPublishedRecordId({
          uri: 'at://did:plc:original/network.cosmik.card/original1',
          cid: 'bafyoriginal1',
        })
        .buildOrThrow();

      const testUrl2 = URL.create('https://example.com/article2').unwrap();
      const metadata2 = UrlMetadata.create({
        url: testUrl2.value,
        title: 'Test Article 2',
        description: 'Second test article',
        retrievedAt: new Date(),
      }).unwrap();

      const card2 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(testUrl2, metadata2)
        .withUrl(testUrl2)
        .withPublishedRecordId({
          uri: 'at://did:plc:original/network.cosmik.card/original2',
          cid: 'bafyoriginal2',
        })
        .buildOrThrow();

      // Add cards to curator's library and publish them
      card1.addToLibrary(curatorId);
      card2.addToLibrary(curatorId);

      const card1PublishResult = await cardPublisher.publishCardToLibrary(
        card1,
        curatorId,
      );
      expect(card1PublishResult.isOk()).toBe(true);
      const card1RecordId = card1PublishResult.unwrap();
      card1.markCardInLibraryAsPublished(curatorId, card1RecordId);

      const card2PublishResult = await cardPublisher.publishCardToLibrary(
        card2,
        curatorId,
      );
      expect(card2PublishResult.isOk()).toBe(true);
      const card2RecordId = card2PublishResult.unwrap();
      card2.markCardInLibraryAsPublished(curatorId, card2RecordId);

      console.log(
        `Published cards: ${card1RecordId.getValue().uri}, ${card2RecordId.getValue().uri}`,
      );

      // 2. Create a collection and add the cards
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection with Cards')
        .withDescription('A collection containing test cards')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Add cards to collection
      const addCard1Result = collection.addCard(card1.cardId, curatorId);
      expect(addCard1Result.isOk()).toBe(true);

      const addCard2Result = collection.addCard(card2.cardId, curatorId);
      expect(addCard2Result.isOk()).toBe(true);

      // 3. Publish the collection (collection record only)
      const publishResult = await collectionPublisher.publish(collection);
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const collectionRecordId = publishResult.value;
        publishedCollectionIds.push(collectionRecordId);

        console.log(
          `Published collection: ${collectionRecordId.getValue().uri}`,
        );

        // Mark collection as published
        collection.markAsPublished(collectionRecordId);

        // 4. Publish the card links separately
        const link1PublishResult =
          await collectionPublisher.publishCardAddedToCollection(
            card1,
            collection,
            curatorId,
          );
        expect(link1PublishResult.isOk()).toBe(true);
        const link1RecordId = link1PublishResult.unwrap();
        publishedLinkIds.push(link1RecordId);
        collection.markCardLinkAsPublished(card1.cardId, link1RecordId);

        const link2PublishResult =
          await collectionPublisher.publishCardAddedToCollection(
            card2,
            collection,
            curatorId,
          );
        expect(link2PublishResult.isOk()).toBe(true);
        const link2RecordId = link2PublishResult.unwrap();
        publishedLinkIds.push(link2RecordId);
        collection.markCardLinkAsPublished(card2.cardId, link2RecordId);

        console.log(
          `Published card links: ${link1RecordId.getValue().uri}, ${link2RecordId.getValue().uri}`,
        );

        // 5. Test adding another card to the existing collection
        const testUrl3 = URL.create('https://example.com/article3').unwrap();
        const metadata3 = UrlMetadata.create({
          url: testUrl3.value,
          title: 'Test Article 3',
          description: 'Third test article',
          retrievedAt: new Date(),
        }).unwrap();

        const card3 = new CardBuilder()
          .withCuratorId(curatorId.value)
          .withUrlCard(testUrl3, metadata3)
          .withUrl(testUrl3)
          .withPublishedRecordId({
            uri: 'at://did:plc:original/network.cosmik.card/original3',
            cid: 'bafyoriginal3',
          })
          .buildOrThrow();

        card3.addToLibrary(curatorId);
        const card3PublishResult = await cardPublisher.publishCardToLibrary(
          card3,
          curatorId,
        );
        expect(card3PublishResult.isOk()).toBe(true);
        const card3RecordId = card3PublishResult.unwrap();
        card3.markCardInLibraryAsPublished(curatorId, card3RecordId);

        // Add the new card to the collection
        const addCard3Result = collection.addCard(card3.cardId, curatorId);
        expect(addCard3Result.isOk()).toBe(true);

        // Publish the new card link
        const link3PublishResult =
          await collectionPublisher.publishCardAddedToCollection(
            card3,
            collection,
            curatorId,
          );
        expect(link3PublishResult.isOk()).toBe(true);
        const link3RecordId = link3PublishResult.unwrap();
        publishedLinkIds.push(link3RecordId);

        console.log(
          `Published additional card link for card 3: ${link3RecordId.getValue().uri}`,
        );

        // 6. Unpublish the collection
        if (UNPUBLISH) {
          const unpublishResult =
            await collectionPublisher.unpublish(collectionRecordId);
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished collection with cards');

          // Remove from cleanup list since we've already unpublished it
          publishedCollectionIds = publishedCollectionIds.filter(
            (id) => id !== collectionRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 30000);

    it('should publish a collection with a card shared between users', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      // Create two different users (we'll simulate userB with the same credentials for testing)
      const userA = CuratorId.create('did:plc:userA').unwrap();
      const userB = curatorId; // Use our test credentials as userB

      // 1. User A creates and publishes a note card to their library
      const originalNote = new CardBuilder()
        .withCuratorId(userA.value)
        .withNoteCard('This is an original note created by User A')
        .withPublishedRecordId({
          uri: 'at://did:plc:userA/network.cosmik.card/original-note',
          cid: 'bafyuserAnote123',
        })
        .buildOrThrow();

      // Simulate User A adding to their own library and publishing
      originalNote.addToLibrary(userA);
      const userALibraryRecordId = PublishedRecordId.create({
        uri: 'at://did:plc:userA/network.cosmik.card/userA-library-note',
        cid: 'bafyuserAlib123',
      });
      originalNote.markCardInLibraryAsPublished(userA, userALibraryRecordId);

      console.log(
        `Simulated User A publishing note: ${originalNote.publishedRecordId?.getValue().uri}`,
      );

      // 2. User B adds the same card to their library
      const addToLibraryResult = originalNote.addToLibrary(userB);
      expect(addToLibraryResult.isOk()).toBe(true);

      // User B publishes the card to their library (this creates a new record in User B's repo)
      const userBPublishResult = await cardPublisher.publishCardToLibrary(
        originalNote,
        userB,
      );
      expect(userBPublishResult.isOk()).toBe(true);
      const userBLibraryRecordId = userBPublishResult.unwrap();
      originalNote.markCardInLibraryAsPublished(userB, userBLibraryRecordId);

      console.log(
        `User B published note to their library: ${userBLibraryRecordId.getValue().uri}`,
      );

      // 3. User B creates a collection
      const userBCollection = new CollectionBuilder()
        .withAuthorId(userB.value)
        .withName('User B Collection with Shared Card')
        .withDescription(
          'Collection containing a card originally created by User A',
        )
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // 4. User B adds the card to their collection
      const addCardResult = userBCollection.addCard(originalNote.cardId, userB);
      expect(addCardResult.isOk()).toBe(true);

      // 5. Publish User B's collection
      const collectionPublishResult =
        await collectionPublisher.publish(userBCollection);
      expect(collectionPublishResult.isOk()).toBe(true);

      if (collectionPublishResult.isOk()) {
        const collectionRecordId = collectionPublishResult.value;
        publishedCollectionIds.push(collectionRecordId);
        userBCollection.markAsPublished(collectionRecordId);

        console.log(
          `Published User B's collection: ${collectionRecordId.getValue().uri}`,
        );

        // 6. Publish the collection link (this should reference both User B's copy and User A's original)
        const linkPublishResult =
          await collectionPublisher.publishCardAddedToCollection(
            originalNote,
            userBCollection,
            userB,
          );
        expect(linkPublishResult.isOk()).toBe(true);

        if (linkPublishResult.isOk()) {
          const linkRecordId = linkPublishResult.value;
          publishedLinkIds.push(linkRecordId);
          userBCollection.markCardLinkAsPublished(
            originalNote.cardId,
            linkRecordId,
          );

          console.log(
            `Published collection link with cross-user card reference: ${linkRecordId.getValue().uri}`,
          );

          // Verify the card has different library memberships
          expect(originalNote.libraryMembershipCount).toBe(2);
          expect(originalNote.isInLibrary(userA)).toBe(true);
          expect(originalNote.isInLibrary(userB)).toBe(true);

          // Verify User B's library membership has a different published record ID than the original
          const userBMembership = originalNote.getLibraryInfo(userB);
          expect(userBMembership).toBeDefined();
          expect(userBMembership!.publishedRecordId).toBeDefined();
          expect(userBMembership!.publishedRecordId!.uri).not.toBe(
            originalNote.publishedRecordId!.uri,
          );

          console.log(
            `Verified cross-user card sharing: Original=${originalNote.publishedRecordId!.uri}, UserB=${userBMembership!.publishedRecordId!.uri}`,
          );
        }

        // 7. Clean up
        if (UNPUBLISH) {
          const unpublishResult =
            await collectionPublisher.unpublish(collectionRecordId);
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished collection with shared card');

          publishedCollectionIds = publishedCollectionIds.filter(
            (id) => id !== collectionRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 30000);
  });

  describe.skip('Closed Collection Publishing', () => {
    it('should publish a closed collection with collaborators', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      const collaboratorDid = 'did:plc:collaborator123'; // Mock collaborator

      // Create a closed collection with collaborators
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Closed Test Collection')
        .withDescription('A closed collection for testing')
        .withAccessType(CollectionAccessType.CLOSED)
        .withCollaborators([collaboratorDid])
        .buildOrThrow();

      // 1. Publish the collection
      const publishResult = await collectionPublisher.publish(collection);
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const collectionRecordId = publishResult.value;
        publishedCollectionIds.push(collectionRecordId);

        console.log(
          `Published closed collection: ${collectionRecordId.getValue().uri}`,
        );

        // Mark collection as published
        collection.markAsPublished(collectionRecordId);

        // Verify collection properties
        expect(collection.accessType).toBe(CollectionAccessType.CLOSED);
        expect(collection.collaboratorIds).toHaveLength(1);
        expect(collection.collaboratorIds[0]?.value).toBe(collaboratorDid);

        // 2. Unpublish the collection
        if (UNPUBLISH) {
          const unpublishResult =
            await collectionPublisher.unpublish(collectionRecordId);
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished closed collection');

          // Remove from cleanup list since we've already unpublished it
          publishedCollectionIds = publishedCollectionIds.filter(
            (id) => id !== collectionRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Create a publisher with invalid credentials
      const invalidAgentService = new AppPasswordAgentService({
        did: 'did:plc:invalid',
        password: 'invalid-password',
      });

      const collections = envConfig.getAtProtoConfig().collections;
      const invalidPublisher = new ATProtoCollectionPublisher(
        invalidAgentService,
        collections.collection,
        collections.collectionLink,
        collections.marginCollection,
        collections.marginCollectionItem,
      );

      const testCollection = new CollectionBuilder()
        .withAuthorId('did:plc:invalid')
        .withName('Test Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const result = await invalidPublisher.publish(testCollection);
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.message).toMatch(/authentication|error/i);
      }
    }, 10000);

    it('should handle invalid record IDs for unpublishing', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      const invalidRecordId = PublishedRecordId.create({
        uri: 'at://did:plc:invalid/network.cosmik.collection/invalid',
        cid: 'bafyinvalid',
      });

      const result = await collectionPublisher.unpublish(invalidRecordId);
      expect(result.isErr()).toBe(true);
    }, 10000);

    it('should handle collections with unpublished cards gracefully', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      // Create a collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection with Unpublished Card')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Create an unpublished card
      const unpublishedCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('Unpublished note')
        .buildOrThrow();

      // Add unpublished card to collection
      const addCardResult = collection.addCard(
        unpublishedCard.cardId,
        curatorId,
      );
      expect(addCardResult.isOk()).toBe(true);

      // Try to publish the collection (should succeed)
      const publishResult = await collectionPublisher.publish(collection);
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const collectionRecordId = publishResult.value;
        publishedCollectionIds.push(collectionRecordId);

        console.log(
          `Published collection: ${collectionRecordId.getValue().uri}`,
        );

        collection.markAsPublished(collectionRecordId);

        // Try to publish the card link (should fail because card is not published)
        const linkPublishResult =
          await collectionPublisher.publishCardAddedToCollection(
            unpublishedCard,
            collection,
            curatorId,
          );
        expect(linkPublishResult.isErr()).toBe(true);

        if (linkPublishResult.isErr()) {
          expect(linkPublishResult.error.message).toMatch(
            /published in curator's library/i,
          );
        }

        // Clean up
        if (UNPUBLISH) {
          const unpublishResult =
            await collectionPublisher.unpublish(collectionRecordId);
          expect(unpublishResult.isOk()).toBe(true);
          publishedCollectionIds = publishedCollectionIds.filter(
            (id) => id !== collectionRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 15000);
  });
});
