import { ATProtoCardPublisher } from '../publishers/ATProtoCardPublisher';
import { CardBuilder } from 'src/modules/cards/tests/utils/builders/CardBuilder';
import { URL } from 'src/modules/cards/domain/value-objects/URL';
import { UrlMetadata } from 'src/modules/cards/domain/value-objects/UrlMetadata';
import { UrlType } from 'src/modules/cards/domain/value-objects/UrlType';
import { CuratorId } from 'src/modules/cards/domain/value-objects/CuratorId';
import dotenv from 'dotenv';
import { AppPasswordAgentService } from './AppPasswordAgentService';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Set to false to skip unpublishing (useful for debugging published records)
const UNPUBLISH = true;

describe.skip('ATProtoCardPublisher', () => {
  let publisher: ATProtoCardPublisher;
  let curatorId: CuratorId;
  let publishedCardIds: PublishedRecordId[] = [];
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
    publisher = new ATProtoCardPublisher(agentService, collections.card);
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

    // Clean up all published cards
    for (const cardId of publishedCardIds) {
      try {
        await publisher.unpublishCardFromLibrary(cardId, curatorId);
        console.log(`Cleaned up card: ${cardId.getValue().uri}`);
      } catch (error) {
        console.warn(`Failed to clean up card: ${error}`);
      }
    }
  });

  describe('URL Card Publishing', () => {
    it('should publish and unpublish a URL card', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      const testUrl = URL.create('https://example.com/test-article').unwrap();

      // Create URL metadata
      const metadata = UrlMetadata.create({
        url: testUrl.value,
        title: 'Test Article',
        description: 'A test article for card publishing',
        author: 'Test Author',
        siteName: 'Example.com',
        type: UrlType.ARTICLE,
        retrievedAt: new Date(),
      }).unwrap();

      // Create a URL card
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(testUrl, metadata)
        .withUrl(testUrl) // Set the required URL property
        .buildOrThrow();

      // Add card to curator's library first
      urlCard.addToLibrary(curatorId);

      // 1. Publish the card
      const publishResult = await publisher.publishCardToLibrary(
        urlCard,
        curatorId,
      );
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const publishedRecordId = publishResult.value;
        publishedCardIds.push(publishedRecordId);

        // Mark card as published in library
        urlCard.markCardInLibraryAsPublished(curatorId, publishedRecordId);
        expect(urlCard.isInLibrary(curatorId)).toBe(true);

        // 2. Test updating the card
        const updateResult = await publisher.publishCardToLibrary(
          urlCard,
          curatorId,
        );
        expect(updateResult.isOk()).toBe(true);

        if (updateResult.isOk()) {
          expect(updateResult.value).toBe(publishedRecordId);
          console.log(`Updated URL card: ${publishedRecordId.getValue().uri}`);
        }

        // 3. Unpublish the card
        if (UNPUBLISH) {
          const unpublishResult = await publisher.unpublishCardFromLibrary(
            publishedRecordId,
            curatorId,
          );
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished URL card');

          // Remove from cleanup list since we've already unpublished it
          publishedCardIds = publishedCardIds.filter(
            (id) => id !== publishedRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 15000);
  });

  describe('Note Card Publishing', () => {
    it('should publish and unpublish a note card', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      // Create a note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This is a test note for publishing')
        .buildOrThrow();

      // Add card to curator's library first
      noteCard.addToLibrary(curatorId);

      // 1. Publish the card
      const publishResult = await publisher.publishCardToLibrary(
        noteCard,
        curatorId,
      );
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const publishedRecordId = publishResult.value;
        publishedCardIds.push(publishedRecordId);

        console.log(`Published note card: ${publishedRecordId.getValue().uri}`);

        // Mark card as published in library
        noteCard.markCardInLibraryAsPublished(curatorId, publishedRecordId);
        expect(noteCard.isInLibrary(curatorId)).toBe(true);

        // 2. Unpublish the card
        if (UNPUBLISH) {
          const unpublishResult = await publisher.unpublishCardFromLibrary(
            publishedRecordId,
            curatorId,
          );
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished note card');

          // Remove from cleanup list since we've already unpublished it
          publishedCardIds = publishedCardIds.filter(
            (id) => id !== publishedRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 15000);
  });

  describe('Note Card with URL Publishing', () => {
    it('should publish a note card with optional URL', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      const referenceUrl = URL.create('https://example.com/reference').unwrap();

      // Create a note card with optional URL
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This note references a URL')
        .withUrl(referenceUrl)
        .buildOrThrow();

      // Add card to curator's library first
      noteCard.addToLibrary(curatorId);

      // 1. Publish the card
      const publishResult = await publisher.publishCardToLibrary(
        noteCard,
        curatorId,
      );
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const publishedRecordId = publishResult.value;
        publishedCardIds.push(publishedRecordId);

        console.log(
          `Published note card with URL: ${publishedRecordId.getValue().uri}`,
        );

        // Verify the card has the URL
        expect(noteCard.url).toBe(referenceUrl);

        // 2. Unpublish the card
        if (UNPUBLISH) {
          const unpublishResult = await publisher.unpublishCardFromLibrary(
            publishedRecordId,
            curatorId,
          );
          expect(unpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished note card with URL');

          // Remove from cleanup list since we've already unpublished it
          publishedCardIds = publishedCardIds.filter(
            (id) => id !== publishedRecordId,
          );
        } else {
          console.log('Skipping unpublish: UNPUBLISH is set to false');
        }
      }
    }, 15000);

    it('should publish a note card that references a parent URL card', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      const parentUrl = URL.create(
        'https://example.com/parent-article',
      ).unwrap();

      // Create URL metadata for parent card
      const metadata = UrlMetadata.create({
        url: parentUrl.value,
        title: 'Parent Article',
        description: 'An article that will be referenced by a note',
        author: 'Parent Author',
        siteName: 'Example.com',
        type: UrlType.ARTICLE,
        retrievedAt: new Date(),
      }).unwrap();

      // 1. Create and publish the parent URL card first
      const parentUrlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(parentUrl, metadata)
        .withUrl(parentUrl)
        .buildOrThrow();

      // Add parent card to curator's library
      parentUrlCard.addToLibrary(curatorId);

      // Publish the parent URL card
      const parentPublishResult = await publisher.publishCardToLibrary(
        parentUrlCard,
        curatorId,
      );
      expect(parentPublishResult.isOk()).toBe(true);

      if (parentPublishResult.isOk()) {
        const parentPublishedRecordId = parentPublishResult.value;
        publishedCardIds.push(parentPublishedRecordId);

        // Mark parent card as published in library
        parentUrlCard.markCardInLibraryAsPublished(
          curatorId,
          parentPublishedRecordId,
        );

        console.log(
          `Published parent URL card: ${parentPublishedRecordId.getValue().uri}`,
        );

        // 2. Create a note card that references the parent URL card
        const noteCard = new CardBuilder()
          .withCuratorId(curatorId.value)
          .withNoteCard('This is my note about the parent article')
          .withParentCard(parentUrlCard.cardId)
          .withUrl(parentUrl) // Optional: include the same URL as reference
          .buildOrThrow();

        noteCard.addToLibrary(curatorId);

        // 3. Publish the note card
        const notePublishResult = await publisher.publishCardToLibrary(
          noteCard,
          curatorId,
          parentUrlCard.publishedRecordId,
        );
        expect(notePublishResult.isOk()).toBe(true);

        if (notePublishResult.isOk()) {
          const notePublishedRecordId = notePublishResult.value;
          publishedCardIds.push(notePublishedRecordId);

          console.log(
            `Published note card with parent reference: ${notePublishedRecordId.getValue().uri}`,
          );

          // Verify the note card has the parent card ID
          expect(noteCard.parentCardId!.equals(parentUrlCard.cardId)).toBe(
            true,
          );

          // Mark note card as published in library
          noteCard.markCardInLibraryAsPublished(
            curatorId,
            notePublishedRecordId,
          );
          expect(noteCard.isInLibrary(curatorId)).toBe(true);

          // 4. Unpublish both cards (note card first, then parent)
          if (UNPUBLISH) {
            const noteUnpublishResult =
              await publisher.unpublishCardFromLibrary(
                notePublishedRecordId,
                curatorId,
              );
            expect(noteUnpublishResult.isOk()).toBe(true);

            console.log('Successfully unpublished note card');

            // Remove from cleanup list since we've already unpublished it
            publishedCardIds = publishedCardIds.filter(
              (id) => id !== notePublishedRecordId,
            );
          } else {
            console.log(
              'Skipping note card unpublish: UNPUBLISH is set to false',
            );
          }
        }

        // Unpublish the parent URL card
        if (UNPUBLISH) {
          const parentUnpublishResult =
            await publisher.unpublishCardFromLibrary(
              parentPublishedRecordId,
              curatorId,
            );
          expect(parentUnpublishResult.isOk()).toBe(true);

          console.log('Successfully unpublished parent URL card');

          // Remove from cleanup list since we've already unpublished it
          publishedCardIds = publishedCardIds.filter(
            (id) => id !== parentPublishedRecordId,
          );
        } else {
          console.log(
            'Skipping parent card unpublish: UNPUBLISH is set to false',
          );
        }
      }
    }, 20000);
  });

  describe('Note Card with Original Published Record ID', () => {
    it('should publish a note card that references an original published record', async () => {
      // Skip test if credentials are not available
      if (!process.env.BSKY_DID || !process.env.BSKY_APP_PASSWORD) {
        console.warn('Skipping test: BSKY credentials not found in .env.test');
        return;
      }

      const referenceUrl = URL.create(
        'https://example.com/referenced-article',
      ).unwrap();

      // Create a note card with an original published record ID (simulating a note that references another published card)
      const originalRecordId = {
        uri: 'at://did:plc:example/network.cosmik.card/original123',
        cid: 'bafyoriginal123',
      };

      const curatorId2 = CuratorId.create('did:plc:defaultCurator2').unwrap();
      const noteCardWithOriginal = new CardBuilder()
        .withCuratorId(curatorId2.value)
        .withNoteCard('This is my note about the referenced article')
        .withUrl(referenceUrl) // Optional URL reference
        .withPublishedRecordId(originalRecordId)
        .buildOrThrow();

      // Add card to curator's library first
      noteCardWithOriginal.addToLibrary(curatorId2);
      noteCardWithOriginal.markCardInLibraryAsPublished(
        curatorId2,
        PublishedRecordId.create(originalRecordId),
      );
      noteCardWithOriginal.addToLibrary(curatorId);

      // 1. Publish the card
      const publishResult = await publisher.publishCardToLibrary(
        noteCardWithOriginal,
        curatorId,
      );
      expect(publishResult.isOk()).toBe(true);

      if (publishResult.isOk()) {
        const publishedRecordId = publishResult.value;
        publishedCardIds.push(publishedRecordId);

        console.log(
          `Published note card with original record ID: ${publishedRecordId.getValue().uri}`,
        );

        // Verify the card has the original published record ID
        expect(noteCardWithOriginal.publishedRecordId).toBeDefined();
        expect(noteCardWithOriginal.publishedRecordId!.getValue().uri).toBe(
          originalRecordId.uri,
        );
        expect(noteCardWithOriginal.publishedRecordId!.getValue().cid).toBe(
          originalRecordId.cid,
        );

        // Verify it's a note card with optional URL
        expect(noteCardWithOriginal.isNoteCard).toBe(true);
        expect(noteCardWithOriginal.url).toBe(referenceUrl);

        // Mark card as published in library
        noteCardWithOriginal.markCardInLibraryAsPublished(
          curatorId,
          publishedRecordId,
        );
        expect(noteCardWithOriginal.isInLibrary(curatorId)).toBe(true);

        // 2. Unpublish the card
        if (UNPUBLISH) {
          const unpublishResult = await publisher.unpublishCardFromLibrary(
            publishedRecordId,
            curatorId,
          );
          expect(unpublishResult.isOk()).toBe(true);

          console.log(
            'Successfully unpublished note card with original record ID',
          );

          // Remove from cleanup list since we've already unpublished it
          publishedCardIds = publishedCardIds.filter(
            (id) => id !== publishedRecordId,
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
      const invalidPublisher = new ATProtoCardPublisher(
        invalidAgentService,
        collections.card,
      );

      const invalidCuratorId = CuratorId.create('did:plc:invalid').unwrap();
      const testCard = new CardBuilder()
        .withCuratorId('did:plc:invalid')
        .withNoteCard('Test note')
        .buildOrThrow();

      // Add card to curator's library first
      testCard.addToLibrary(invalidCuratorId);

      const result = await invalidPublisher.publishCardToLibrary(
        testCard,
        invalidCuratorId,
      );
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
        uri: 'at://did:plc:invalid/network.cosmik.card/invalid',
        cid: 'bafyinvalid',
      });

      const result = await publisher.unpublishCardFromLibrary(
        invalidRecordId,
        curatorId,
      );
      expect(result.isErr()).toBe(true);
    }, 10000);
  });
});
