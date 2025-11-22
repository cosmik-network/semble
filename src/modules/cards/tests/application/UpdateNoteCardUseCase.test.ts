import { UpdateNoteCardUseCase } from '../../application/useCases/commands/UpdateNoteCardUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import {
  CardFactory,
  INoteCardInput,
  IUrlCardInput,
} from '../../domain/CardFactory';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { CardLibraryService } from '../../domain/services/CardLibraryService';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';

describe('UpdateNoteCardUseCase', () => {
  let useCase: UpdateNoteCardUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let cardCollectionService: CardCollectionService;
  let cardLibraryService: CardLibraryService;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    collectionPublisher = new FakeCollectionPublisher();
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

    useCase = new UpdateNoteCardUseCase(cardRepository, cardPublisher);

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    cardPublisher.clear();
  });

  const createNoteCard = async (authorId: CuratorId, text: string) => {
    const noteCardInput: INoteCardInput = {
      type: CardTypeEnum.NOTE,
      text,
    };

    const noteCardResult = CardFactory.create({
      curatorId: authorId.value,
      cardInput: noteCardInput,
    });

    if (noteCardResult.isErr()) {
      throw new Error(
        `Failed to create note card: ${noteCardResult.error.message}`,
      );
    }

    const noteCard = noteCardResult.value;

    // Add to library and save
    await cardLibraryService.addCardToLibrary(noteCard, authorId);
    await cardRepository.save(noteCard);

    return noteCard;
  };

  describe('Basic note card update', () => {
    it('should successfully update a note card', async () => {
      const originalText = 'This is my original note';
      const updatedText = 'This is my updated note with more content';

      // Create a note card
      const noteCard = await createNoteCard(curatorId, originalText);

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: updatedText,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cardId).toBe(noteCard.cardId.getStringValue());

      // Verify card was updated in repository
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      expect(updatedCardResult.isOk()).toBe(true);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.content.noteContent!.text).toBe(updatedText);

      // Verify library membership is marked as published
      const libraryInfo = updatedCard!.getLibraryInfo(curatorId);
      expect(libraryInfo).toBeDefined();
      expect(libraryInfo!.publishedRecordId).toBeDefined();
    });

    it('should update card content while preserving other properties', async () => {
      const originalText = 'Original note';
      const updatedText = 'Updated note';

      // Create a note card
      const noteCard = await createNoteCard(curatorId, originalText);
      const originalCreatedAt = noteCard.createdAt;
      const originalCardId = noteCard.cardId.getStringValue();

      const request = {
        cardId: originalCardId,
        note: updatedText,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card properties are preserved
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      const updatedCard = updatedCardResult.unwrap()!;

      expect(updatedCard.cardId.getStringValue()).toBe(originalCardId);
      expect(updatedCard.createdAt).toEqual(originalCreatedAt);
      expect(updatedCard.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalCreatedAt.getTime(),
      );
      expect(updatedCard.type.value).toBe(CardTypeEnum.NOTE);
      expect(updatedCard.curatorId.equals(curatorId)).toBe(true);
    });
  });

  describe('Authorization', () => {
    it("should fail when trying to update another user's note card", async () => {
      const originalText = "This is someone else's note";

      // Create a note card with one curator
      const noteCard = await createNoteCard(curatorId, originalText);

      // Try to update with different curator
      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: "Trying to update someone else's note",
        curatorId: otherCuratorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Only the author can update this note card',
        );
      }

      // Verify original card was not modified
      const originalCardResult = await cardRepository.findById(noteCard.cardId);
      const originalCard = originalCardResult.unwrap()!;
      expect(originalCard.content.noteContent!.text).toBe(originalText);
    });

    it('should allow author to update their own note card', async () => {
      const originalText = 'My note';
      const updatedText = 'My updated note';

      // Create and update with same curator
      const noteCard = await createNoteCard(curatorId, originalText);

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: updatedText,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify update was successful
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      const updatedCard = updatedCardResult.unwrap()!;
      expect(updatedCard.content.noteContent!.text).toBe(updatedText);
    });
  });

  describe('Validation', () => {
    it('should fail with invalid curator ID', async () => {
      const noteCard = await createNoteCard(curatorId, 'Some note');

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: 'Updated note',
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail when card does not exist', async () => {
      const request = {
        cardId: 'non-existent-card-id',
        note: 'Some note text',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Card not found');
      }
    });

    it('should fail when trying to update a non-note card', async () => {
      // Create a URL card instead of a note card
      const urlCardInput: IUrlCardInput = {
        type: CardTypeEnum.URL,
        url: 'https://example.com',
        metadata: UrlMetadata.create({
          title: 'Example URL',
          description: 'This is an example URL card',
          imageUrl: 'https://example.com/image.png',
          type: 'article',
          url: 'https://example.com',
          author: 'John Doe',
          publishedDate: new Date('2023-01-01'),
          siteName: 'Example Site',
          retrievedAt: new Date(),
        }).unwrap(),
      };

      const urlCardResult = CardFactory.create({
        curatorId: curatorId.value,
        cardInput: urlCardInput,
      });

      if (urlCardResult.isErr()) {
        throw new Error(
          `Failed to create URL card: ${urlCardResult.error.message}`,
        );
      }

      const urlCard = urlCardResult.value;
      await cardRepository.save(urlCard);

      const request = {
        cardId: urlCard.cardId.getStringValue(),
        note: 'Trying to update a URL card as note',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Card is not a note card and cannot be updated',
        );
      }
    });

    it('should fail with empty note text', async () => {
      const noteCard = await createNoteCard(curatorId, 'Original note');

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: '',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Note text cannot be empty');
      }
    });

    it('should fail with note text that is too long', async () => {
      const noteCard = await createNoteCard(curatorId, 'Original note');
      const tooLongText = 'a'.repeat(10001); // Exceeds MAX_TEXT_LENGTH

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: tooLongText,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Note text cannot exceed');
      }
    });

    it('should trim whitespace from note text', async () => {
      const noteCard = await createNoteCard(curatorId, 'Original note');
      const textWithWhitespace = '  Updated note with whitespace  ';
      const expectedTrimmedText = 'Updated note with whitespace';

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: textWithWhitespace,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify text was trimmed
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      const updatedCard = updatedCardResult.unwrap()!;
      expect(updatedCard.content.noteContent!.text).toBe(expectedTrimmedText);
    });
  });

  describe('Publishing integration', () => {
    it('should publish updated card before saving to repository', async () => {
      const noteCard = await createNoteCard(curatorId, 'Original note');

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: 'Updated note',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify the published record ID was updated in the library membership
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      const updatedCard = updatedCardResult.unwrap()!;
      const libraryInfo = updatedCard.getLibraryInfo(curatorId);
      expect(libraryInfo!.publishedRecordId).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle updating to the same text', async () => {
      const noteText = 'Same note text';
      const noteCard = await createNoteCard(curatorId, noteText);

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: noteText,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was still updated (updatedAt should change)
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      const updatedCard = updatedCardResult.unwrap()!;
      expect(updatedCard.content.noteContent!.text).toBe(noteText);
      expect(updatedCard.updatedAt.getTime()).toBeGreaterThanOrEqual(
        noteCard.createdAt.getTime(),
      );
    });

    it('should handle maximum length note text', async () => {
      const noteCard = await createNoteCard(curatorId, 'Original note');
      const maxLengthText = 'a'.repeat(10000); // Exactly MAX_TEXT_LENGTH

      const request = {
        cardId: noteCard.cardId.getStringValue(),
        note: maxLengthText,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify text was saved correctly
      const updatedCardResult = await cardRepository.findById(noteCard.cardId);
      const updatedCard = updatedCardResult.unwrap()!;
      expect(updatedCard.content.noteContent!.text).toBe(maxLengthText);
      expect(updatedCard.content.noteContent!.text.length).toBe(10000);
    });
  });
});
