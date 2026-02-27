import { ProcessCardFirehoseEventUseCase } from '../../application/useCases/ProcessCardFirehoseEventUseCase';
import { InMemoryAtUriResolutionService } from '../../../cards/tests/utils/InMemoryAtUriResolutionService';
import { AddUrlToLibraryUseCase } from '../../../cards/application/useCases/commands/AddUrlToLibraryUseCase';
import { UpdateUrlCardAssociationsUseCase } from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { RemoveCardFromLibraryUseCase } from '../../../cards/application/useCases/commands/RemoveCardFromLibraryUseCase';
import { InMemoryCardRepository } from '../../../cards/tests/utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../../../cards/tests/utils/InMemoryCollectionRepository';
import { InMemoryConnectionRepository } from '../../../cards/tests/utils/InMemoryConnectionRepository';
import { FakeCardPublisher } from '../../../cards/tests/utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../../../cards/tests/utils/FakeCollectionPublisher';
import { FakeMetadataService } from '../../../cards/tests/utils/FakeMetadataService';
import { FakeEventPublisher } from '../../../cards/tests/utils/FakeEventPublisher';
import { CardLibraryService } from '../../../cards/domain/services/CardLibraryService';
import { CardCollectionService } from '../../../cards/domain/services/CardCollectionService';
import { CardBuilder } from '../../../cards/tests/utils/builders/CardBuilder';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { URL } from '../../../cards/domain/value-objects/URL';
import { Record as CardRecord } from '../../infrastructure/lexicon/types/network/cosmik/card';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';

describe('ProcessCardFirehoseEventUseCase', () => {
  let useCase: ProcessCardFirehoseEventUseCase;
  let atUriResolutionService: InMemoryAtUriResolutionService;
  let addUrlToLibraryUseCase: AddUrlToLibraryUseCase;
  let updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase;
  let removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let connectionRepository: InMemoryConnectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let metadataService: FakeMetadataService;
  let eventPublisher: FakeEventPublisher;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let curatorId: CuratorId;
  let configService: EnvironmentConfigService;

  beforeEach(() => {
    configService = new EnvironmentConfigService();
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    connectionRepository = InMemoryConnectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    metadataService = new FakeMetadataService();
    eventPublisher = new FakeEventPublisher();

    cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
      cardRepository,
    );
    cardLibraryService = new CardLibraryService(
      cardRepository,
      cardPublisher,
      collectionRepository,
      cardCollectionService,
    );

    atUriResolutionService = new InMemoryAtUriResolutionService(
      collectionRepository,
      cardRepository,
      connectionRepository,
    );

    addUrlToLibraryUseCase = new AddUrlToLibraryUseCase(
      cardRepository,
      metadataService,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    updateUrlCardAssociationsUseCase = new UpdateUrlCardAssociationsUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    removeCardFromLibraryUseCase = new RemoveCardFromLibraryUseCase(
      cardRepository,
      cardLibraryService,
      eventPublisher,
    );

    useCase = new ProcessCardFirehoseEventUseCase(
      atUriResolutionService,
      addUrlToLibraryUseCase,
      updateUrlCardAssociationsUseCase,
      removeCardFromLibraryUseCase,
      cardRepository,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    cardPublisher.clear();
    collectionPublisher.clear();
    metadataService.clear();
    eventPublisher.clear();
  });

  describe('URL Card Creation Events', () => {
    it('should process URL card create event successfully', async () => {
      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.card}/test-card-id`;
      const cid = 'test-cid-123';

      const cardRecord: CardRecord = {
        $type: 'network.cosmik.card',
        type: 'URL',
        content: {
          $type: 'network.cosmik.card#urlContent',
          url: 'https://example.com/article',
          metadata: {
            title: 'Test Article',
            description: 'A test article',
          },
        },
        url: 'https://example.com/article',
        createdAt: new Date().toISOString(),
      };

      const request = {
        atUri,
        cid,
        eventType: 'create' as const,
        record: cardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was created and added to library
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(1);

      const urlCard = savedCards[0]!;
      expect(urlCard.content.type).toBe(CardTypeEnum.URL);
      expect(urlCard.curatorId.equals(curatorId)).toBe(true);
      expect(urlCard.isInLibrary(curatorId)).toBe(true);

      // Verify published record ID was set (from firehose event)
      expect(urlCard.publishedRecordId).toBeDefined();
      expect(urlCard.publishedRecordId?.uri).toBe(atUri);
      expect(urlCard.publishedRecordId?.cid).toBe(cid);

      // Verify no additional publishing occurred (should skip since publishedRecordId provided)
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(0);
    });

    it('should handle invalid AT URI gracefully', async () => {
      const request = {
        atUri: 'invalid-uri',
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should handle missing record gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        // record is undefined
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should handle missing CID gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/test-card-id`,
        cid: null,
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should handle URL card with missing URL gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            // url is missing
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });
  });

  describe('Note Card Creation Events', () => {
    it('should process note card create event successfully', async () => {
      // First create a parent URL card
      const parentCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .withUrl(URL.create('https://example.com/parent').unwrap())
        .build();

      if (parentCard instanceof Error) throw parentCard;
      await cardRepository.save(parentCard);

      // Add parent card to library
      await cardLibraryService.addCardToLibrary(parentCard, curatorId);

      const collections = configService.getAtProtoCollections();
      const parentAtUri = `at://${curatorId.value}/${collections.card}/${parentCard.cardId.getStringValue()}`;
      const noteAtUri = `at://${curatorId.value}/${collections.card}/note-card-id`;
      const cid = 'note-cid-123';

      const noteRecord: CardRecord = {
        $type: 'network.cosmik.card',
        type: 'NOTE',
        content: {
          $type: 'network.cosmik.card#noteContent',
          text: 'This is my note about the article',
        },
        parentCard: {
          uri: parentAtUri,
          cid: 'parent-cid',
        },
        createdAt: new Date().toISOString(),
      };

      const request = {
        atUri: noteAtUri,
        cid,
        eventType: 'create' as const,
        record: noteRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify note card was created
      const savedCards = cardRepository.getAllCards();
      const noteCards = savedCards.filter(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCards).toHaveLength(1);

      const noteCard = noteCards[0]!;
      expect(noteCard.content.noteContent?.text).toBe(
        'This is my note about the article',
      );
      expect(noteCard.curatorId.equals(curatorId)).toBe(true);
      expect(noteCard.isInLibrary(curatorId)).toBe(true);

      // Verify published record ID was set (from firehose event)
      expect(noteCard.publishedRecordId).toBeDefined();
      expect(noteCard.publishedRecordId?.uri).toBe(noteAtUri);
      expect(noteCard.publishedRecordId?.cid).toBe(cid);

      // Verify no additional publishing occurred
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);
    });

    it('should handle note card with missing parent card gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/note-card-id`,
        cid: 'note-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'NOTE',
          content: {
            $type: 'network.cosmik.card#noteContent',
            text: 'This is my note',
          },
          parentCard: {
            uri: `at://did:plc:nonexistent/${collections.card}/missing`,
            cid: 'missing-cid',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing

      // Verify no note card was created
      const savedCards = cardRepository.getAllCards();
      const noteCards = savedCards.filter(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCards).toHaveLength(0);
    });

    it('should handle note card with missing text gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/note-card-id`,
        cid: 'note-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'NOTE',
          content: {
            $type: 'network.cosmik.card#noteContent',
            // text is missing
          },
          parentCard: {
            uri: `at://did:plc:test/${collections.card}/parent`,
            cid: 'parent-cid',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should handle note card without parent card reference gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/note-card-id`,
        cid: 'note-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'NOTE',
          content: {
            $type: 'network.cosmik.card#noteContent',
            text: 'This is my note',
          },
          // parentCard is missing
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should not create a second note card when one already exists for the URL', async () => {
      // First create a parent URL card
      const parentCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .withUrl(URL.create('https://example.com/parent').unwrap())
        .build();

      if (parentCard instanceof Error) throw parentCard;
      await cardRepository.save(parentCard);

      // Add parent card to library
      await cardLibraryService.addCardToLibrary(parentCard, curatorId);

      // Create first note card
      const firstNoteCard = new CardBuilder()
        .withType(CardTypeEnum.NOTE)
        .withCuratorId(curatorId.value)
        .withParentCard(parentCard.cardId)
        .withUrl(parentCard.url!)
        .withNoteCard('First note about this article')
        .build();

      if (firstNoteCard instanceof Error) throw firstNoteCard;
      await cardRepository.save(firstNoteCard);
      await cardLibraryService.addCardToLibrary(firstNoteCard, curatorId);

      const collections = configService.getAtProtoCollections();
      const parentAtUri = `at://${curatorId.value}/${collections.card}/${parentCard.cardId.getStringValue()}`;
      const secondNoteAtUri = `at://${curatorId.value}/${collections.card}/second-note-card-id`;
      const cid = 'second-note-cid-123';

      const secondNoteRecord: CardRecord = {
        $type: 'network.cosmik.card',
        type: 'NOTE',
        content: {
          $type: 'network.cosmik.card#noteContent',
          text: 'Second note about the same article',
        },
        parentCard: {
          uri: parentAtUri,
          cid: 'parent-cid',
        },
        createdAt: new Date().toISOString(),
      };

      const request = {
        atUri: secondNoteAtUri,
        cid,
        eventType: 'create' as const,
        record: secondNoteRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify that only one note card exists (the original one should remain unchanged)
      const savedCards = cardRepository.getAllCards();
      const noteCards = savedCards.filter(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCards).toHaveLength(1);

      // Verify the existing note card was NOT updated (should still have original text)
      const noteCard = noteCards[0]!;
      expect(noteCard.content.noteContent?.text).toBe(
        'First note about this article',
      );
      expect(noteCard.curatorId.equals(curatorId)).toBe(true);
      expect(noteCard.isInLibrary(curatorId)).toBe(true);

      // Verify the published record ID was NOT updated (should still be the original)
      expect(noteCard.publishedRecordId).toBeDefined();
      expect(noteCard.publishedRecordId?.uri).not.toBe(secondNoteAtUri);
      expect(noteCard.publishedRecordId?.cid).not.toBe(cid);
    });
  });

  describe('Note Card Update Events', () => {
    it('should process note card update event successfully', async () => {
      // First create a parent URL card
      const parentCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .withUrl(URL.create('https://example.com/parent').unwrap())
        .build();

      if (parentCard instanceof Error) throw parentCard;
      await cardRepository.save(parentCard);
      await cardLibraryService.addCardToLibrary(parentCard, curatorId);

      // Create initial note card
      const noteCard = new CardBuilder()
        .withType(CardTypeEnum.NOTE)
        .withCuratorId(curatorId.value)
        .withParentCard(parentCard.cardId)
        .withUrl(parentCard.url!)
        .withNoteCard('Original note text')
        .build();

      if (noteCard instanceof Error) throw noteCard;
      await cardRepository.save(noteCard);
      await cardLibraryService.addCardToLibrary(noteCard, curatorId);

      const collections = configService.getAtProtoCollections();
      const parentAtUri = `at://${curatorId.value}/${collections.card}/${parentCard.cardId.getStringValue()}`;
      const noteAtUri = `at://${curatorId.value}/${collections.card}/note-card-id`;
      const cid = 'updated-note-cid-123';

      const updatedNoteRecord: CardRecord = {
        $type: 'network.cosmik.card',
        type: 'NOTE',
        content: {
          $type: 'network.cosmik.card#noteContent',
          text: 'Updated note text',
        },
        parentCard: {
          uri: parentAtUri,
          cid: 'parent-cid',
        },
        createdAt: new Date().toISOString(),
      };

      const request = {
        atUri: noteAtUri,
        cid,
        eventType: 'update' as const,
        record: updatedNoteRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify note card was updated
      const savedCards = cardRepository.getAllCards();
      const noteCards = savedCards.filter(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCards).toHaveLength(1);

      const updatedNote = noteCards[0]!;
      expect(updatedNote.content.noteContent?.text).toBe('Updated note text');

      // Verify no additional publishing occurred (firehose event should skip publishing)
      const publishedCards = cardPublisher.getPublishedCards();
      expect(
        publishedCards.filter(
          (publishedCard) => publishedCard.content.type === CardTypeEnum.NOTE,
        ),
      ).toHaveLength(1);
    });

    it('should ignore non-NOTE card update events', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/url-card-id`,
        cid: 'url-cid',
        eventType: 'update' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });
  });

  describe('Card Deletion Events', () => {
    it('should process card delete event successfully', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .build();

      if (card instanceof Error) throw card;
      await cardRepository.save(card);
      await cardLibraryService.addCardToLibrary(card, curatorId);

      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.card}/${card.cardId.getStringValue()}`;

      const request = {
        atUri,
        cid: null, // CID can be null for delete events
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was removed from library and deleted
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Verify no unpublishing occurred (firehose event should skip unpublishing)
      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(0);

      // Verify no collection link unpublishing occurred
      const removedLinks = collectionPublisher.getAllRemovedLinks();
      expect(removedLinks).toHaveLength(0);
    });

    it('should handle delete event for non-existent card gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/nonexistent-card`,
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should handle delete event with invalid AT URI gracefully', async () => {
      const request = {
        atUri: 'invalid-uri',
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should process URL card delete event with note card without unpublishing either', async () => {
      // Create URL card with note
      const urlCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .withUrl(URL.create('https://example.com/article').unwrap())
        .build();

      if (urlCard instanceof Error) throw urlCard;
      await cardRepository.save(urlCard);
      await cardLibraryService.addCardToLibrary(urlCard, curatorId);

      // Create associated note card
      const noteCard = new CardBuilder()
        .withType(CardTypeEnum.NOTE)
        .withCuratorId(curatorId.value)
        .withParentCard(urlCard.cardId)
        .withUrl(urlCard.url!)
        .withNoteCard('My note about this article')
        .build();

      if (noteCard instanceof Error) throw noteCard;
      await cardRepository.save(noteCard);
      await cardLibraryService.addCardToLibrary(noteCard, curatorId);

      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.card}/${urlCard.cardId.getStringValue()}`;

      const request = {
        atUri,
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify both cards were removed from library and deleted
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Verify no unpublishing occurred for either card (firehose event should skip unpublishing)
      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(0);

      // Verify no collection link unpublishing occurred
      const removedLinks = collectionPublisher.getAllRemovedLinks();
      expect(removedLinks).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle AT URI resolution service errors gracefully', async () => {
      // Create a card that exists in repository but not in resolution service
      const card = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .build();

      if (card instanceof Error) throw card;
      await cardRepository.save(card);

      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/unresolvable-card`,
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
    });

    it('should handle use case execution failures gracefully', async () => {
      // Configure metadata service to fail
      metadataService.setShouldFail(true);

      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(cardRepository.getAllCards()).toHaveLength(1);
    });
  });
});
