import {
  ICardQueryRepository,
  CardQueryOptions,
  UrlCardQueryResultDTO,
  CollectionCardQueryResultDTO,
  UrlCardViewDTO,
  UrlCardView,
  PaginatedQueryResult,
  CardSortField,
  SortOrder,
  LibraryForUrlDTO,
  NoteCardForUrlRawDTO,
} from '../../domain/ICardQueryRepository';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { InMemoryCardRepository } from './InMemoryCardRepository';
import { InMemoryCollectionRepository } from './InMemoryCollectionRepository';
import { Card } from '../../domain/Card';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CuratorId } from '../../domain/value-objects/CuratorId';

export class InMemoryCardQueryRepository implements ICardQueryRepository {
  constructor(
    private cardRepository: InMemoryCardRepository,
    private collectionRepository: InMemoryCollectionRepository,
  ) {}

  async getUrlCardsOfUser(
    userId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<UrlCardQueryResultDTO>> {
    try {
      // Get all cards and filter by user's library membership
      const allCards = this.cardRepository.getAllCards();
      let userCards = allCards.filter(
        (card) =>
          card.isUrlCard && card.isInLibrary(CuratorId.create(userId).unwrap()),
      );

      // Filter by urlType if specified
      if (options.urlType) {
        userCards = userCards.filter(
          (card) => card.content.urlContent?.metadata?.type === options.urlType,
        );
      }

      const userCardResults = userCards.map((card) =>
        this.cardToUrlCardQueryResult(card, callingUserId),
      );

      // Sort cards
      const sortedCards = this.sortCards(
        userCardResults,
        options.sortBy,
        options.sortOrder,
      );

      // Apply pagination
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedCards = sortedCards.slice(startIndex, endIndex);

      return {
        items: paginatedCards,
        totalCount: userCardResults.length,
        hasMore: endIndex < userCardResults.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to query URL cards: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sortCards(
    cards: UrlCardQueryResultDTO[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): UrlCardQueryResultDTO[] {
    const sorted = [...cards].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case CardSortField.CREATED_AT:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case CardSortField.UPDATED_AT:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case CardSortField.LIBRARY_COUNT:
          comparison = a.libraryCount - b.libraryCount;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });

    return sorted;
  }

  private cardToUrlCardQueryResult(
    card: Card,
    callingUserId?: string,
  ): UrlCardQueryResultDTO {
    if (!card.isUrlCard || !card.content.urlContent) {
      throw new Error('Card is not a URL card');
    }

    // Find collections this card belongs to by querying the collection repository
    const allCollections = this.collectionRepository.getAllCollections();
    const collections: { id: string; name: string; authorId: string; accessType: string }[] = [];

    for (const collection of allCollections) {
      if (
        collection.cardIds.some(
          (cardId) => cardId.getStringValue() === card.cardId.getStringValue(),
        )
      ) {
        collections.push({
          id: collection.collectionId.getStringValue(),
          name: collection.name.value,
          authorId: collection.authorId.value,
          accessType: collection.accessType,
        });
      }
    }

    // Find note cards with matching URL
    const allCards = this.cardRepository.getAllCards();
    const noteCard = allCards.find(
      (c) => c.type.value === 'NOTE' && c.url?.value === card.url?.value,
    );

    const note = noteCard
      ? {
          id: noteCard.cardId.getStringValue(),
          text: noteCard.content.noteContent?.text || '',
        }
      : undefined;

    // Compute urlInLibrary if callingUserId is provided
    const urlInLibrary = callingUserId
      ? this.isUrlInUserLibrary(
          card.content.urlContent.url.value,
          callingUserId,
        )
      : undefined;

    return {
      id: card.cardId.getStringValue(),
      type: CardTypeEnum.URL,
      url: card.content.urlContent.url.value,
      cardContent: {
        url: card.content.urlContent.url.value,
        title: card.content.urlContent.metadata?.title,
        description: card.content.urlContent.metadata?.description,
        author: card.content.urlContent.metadata?.author,
        imageUrl: card.content.urlContent.metadata?.imageUrl,
      },
      libraryCount: this.getLibraryCountForCard(card.cardId.getStringValue()),
      urlLibraryCount: this.getUrlLibraryCount(
        card.content.urlContent.url.value,
      ),
      urlInLibrary,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      authorId: card.curatorId.value,
      collections,
      note,
    };
  }

  private getLibraryCountForCard(cardId: string): number {
    const card = this.cardRepository.getStoredCard({
      getStringValue: () => cardId,
    } as any);
    return card ? card.libraryMembershipCount : 0;
  }

  private getUrlLibraryCount(url: string): number {
    // Get all URL cards with this URL and count unique library memberships
    const allCards = this.cardRepository.getAllCards();
    const urlCards = allCards.filter(
      (card) => card.isUrlCard && card.url?.value === url,
    );

    // Get all unique user IDs who have any card with this URL
    const uniqueUserIds = new Set<string>();
    for (const card of urlCards) {
      for (const membership of card.libraryMemberships) {
        uniqueUserIds.add(membership.curatorId.value);
      }
    }

    return uniqueUserIds.size;
  }

  private isUrlInUserLibrary(url: string, userId: string): boolean {
    // Check if the user has any URL card with this URL (by checking authorId)
    const allCards = this.cardRepository.getAllCards();
    return allCards.some(
      (card) =>
        card.isUrlCard &&
        card.url?.value === url &&
        card.curatorId.value === userId,
    );
  }

  async getCardsInCollection(
    collectionId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<CollectionCardQueryResultDTO>> {
    try {
      // Get the collection from the repository
      const collectionIdObj = CollectionId.createFromString(collectionId);
      if (collectionIdObj.isErr()) {
        throw new Error(`Invalid collection ID: ${collectionId}`);
      }

      const collectionResult = await this.collectionRepository.findById(
        collectionIdObj.value,
      );
      if (collectionResult.isErr()) {
        throw collectionResult.error;
      }

      const collection = collectionResult.value;
      if (!collection) {
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // Get cards that are in this collection
      const allCards = this.cardRepository.getAllCards();
      const collectionCardIds = new Set(
        collection.cardIds.map((id) => id.getStringValue()),
      );
      let collectionCards = allCards.filter(
        (card) =>
          collectionCardIds.has(card.cardId.getStringValue()) && card.isUrlCard,
      );

      // Filter by urlType if specified
      if (options.urlType) {
        collectionCards = collectionCards.filter(
          (card) => card.content.urlContent?.metadata?.type === options.urlType,
        );
      }

      const collectionCardResults = collectionCards.map((card) =>
        this.toCollectionCardQueryResult(
          this.cardToUrlCardQueryResult(card, callingUserId),
        ),
      );

      // Sort cards
      const sortedCards = this.sortCollectionCards(
        collectionCardResults,
        options.sortBy,
        options.sortOrder,
      );

      // Apply pagination
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedCards = sortedCards.slice(startIndex, endIndex);

      return {
        items: paginatedCards,
        totalCount: collectionCardResults.length,
        hasMore: endIndex < collectionCardResults.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to query collection cards: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sortCollectionCards(
    cards: CollectionCardQueryResultDTO[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): CollectionCardQueryResultDTO[] {
    const sorted = [...cards].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case CardSortField.CREATED_AT:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case CardSortField.UPDATED_AT:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case CardSortField.LIBRARY_COUNT:
          // Sort by URL library count instead of card library count
          comparison = a.urlLibraryCount - b.urlLibraryCount;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });

    return sorted;
  }

  private toCollectionCardQueryResult(
    card: UrlCardQueryResultDTO,
  ): CollectionCardQueryResultDTO {
    return {
      id: card.id,
      type: CardTypeEnum.URL,
      url: card.url,
      cardContent: card.cardContent,
      libraryCount: card.libraryCount,
      urlLibraryCount: card.urlLibraryCount,
      urlInLibrary: card.urlInLibrary,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      authorId: card.authorId,
      note: card.note,
    };
  }

  async getUrlCardView(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardViewDTO | null> {
    const allCards = this.cardRepository.getAllCards();
    const card = allCards.find((c) => c.cardId.getStringValue() === cardId);
    if (!card || !card.isUrlCard) {
      return null;
    }

    const urlCardResult = this.cardToUrlCardQueryResult(card, callingUserId);

    // Get library memberships from the card itself
    const libraries = card.libraryMemberships.map((membership) => ({
      userId: membership.curatorId.value,
    }));

    // Find note cards with matching URL
    const noteCard = allCards.find(
      (c) => c.type.value === 'NOTE' && c.url?.value === card.url?.value,
    );

    const note = noteCard
      ? {
          id: noteCard.cardId.getStringValue(),
          text: noteCard.content.noteContent?.text || '',
        }
      : undefined;

    return {
      ...urlCardResult,
      libraries,
      note,
    };
  }

  async getUrlCardBasic(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardView | null> {
    const allCards = this.cardRepository.getAllCards();
    const card = allCards.find((c) => c.cardId.getStringValue() === cardId);
    if (!card || !card.isUrlCard) {
      return null;
    }

    // Find note card by the same author with matching parent card ID
    const noteCard = allCards.find(
      (c) =>
        c.type.value === 'NOTE' &&
        c.parentCardId?.equals(card.cardId) &&
        c.curatorId.value === card.curatorId.value, // Only notes by the same author
    );

    const note = noteCard
      ? {
          id: noteCard.cardId.getStringValue(),
          text: noteCard.content.noteContent?.text || '',
        }
      : undefined;

    // Compute urlInLibrary if callingUserId is provided
    const urlInLibrary = callingUserId
      ? this.isUrlInUserLibrary(
          card.content.urlContent!.url.value,
          callingUserId,
        )
      : undefined;

    return {
      id: card.cardId.getStringValue(),
      type: CardTypeEnum.URL,
      url: card.content.urlContent!.url.value,
      cardContent: {
        url: card.content.urlContent!.url.value,
        title: card.content.urlContent!.metadata?.title,
        description: card.content.urlContent!.metadata?.description,
        author: card.content.urlContent!.metadata?.author,
        imageUrl: card.content.urlContent!.metadata?.imageUrl,
      },
      libraryCount: this.getLibraryCountForCard(card.cardId.getStringValue()),
      urlLibraryCount: this.getUrlLibraryCount(
        card.content.urlContent!.url.value,
      ),
      urlInLibrary,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      authorId: card.curatorId.value,
      note,
    };
  }

  async getLibrariesForCard(cardId: string): Promise<string[]> {
    const allCards = this.cardRepository.getAllCards();
    const card = allCards.find((c) => c.cardId.getStringValue() === cardId);

    if (!card) {
      return [];
    }

    return card.libraryMemberships.map(
      (membership) => membership.curatorId.value,
    );
  }

  async getLibrariesForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForUrlDTO>> {
    try {
      // Get all cards and filter by URL
      const allCards = this.cardRepository.getAllCards();
      const urlCards = allCards.filter(
        (card) => card.isUrlCard && card.url?.value === url,
      );

      // Create library entries for each card
      const libraries: LibraryForUrlDTO[] = [];
      for (const card of urlCards) {
        // Skip cards without urlContent (should not happen since we filtered for URL cards)
        if (!card.content.urlContent) {
          continue;
        }

        for (const membership of card.libraryMemberships) {
          const noteCard = allCards.find(
            (c) => c.isNoteCard && c.parentCardId?.equals(card.cardId),
          );

          const urlLibraryCount = this.getUrlLibraryCount(url);

          libraries.push({
            userId: membership.curatorId.value,
            card: {
              id: card.cardId.getStringValue(),
              url: card.content.urlContent.url.value,
              cardContent: {
                url: card.content.urlContent.url.value,
                title: card.content.urlContent.metadata?.title,
                description: card.content.urlContent.metadata?.description,
                author: card.content.urlContent.metadata?.author,
                imageUrl: card.content.urlContent.metadata?.imageUrl,
              },
              libraryCount: this.getLibraryCountForCard(
                card.cardId.getStringValue(),
              ),
              urlLibraryCount,
              urlInLibrary: true,
              createdAt: card.createdAt,
              updatedAt: card.updatedAt,
              note: noteCard
                ? {
                    id: noteCard.cardId.getStringValue(),
                    text: noteCard.content.noteContent?.text || '',
                  }
                : undefined,
            },
          });
        }
      }

      // Sort libraries (by userId for consistency)
      const sortedLibraries = this.sortLibraries(
        libraries,
        options.sortBy,
        options.sortOrder,
      );

      // Apply pagination
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedLibraries = sortedLibraries.slice(startIndex, endIndex);

      return {
        items: paginatedLibraries,
        totalCount: libraries.length,
        hasMore: endIndex < libraries.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to query libraries for URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sortLibraries(
    libraries: LibraryForUrlDTO[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): LibraryForUrlDTO[] {
    const sorted = [...libraries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case CardSortField.CREATED_AT:
        case CardSortField.UPDATED_AT:
        case CardSortField.LIBRARY_COUNT:
          // For libraries, we'll sort by userId as a fallback
          comparison = a.userId.localeCompare(b.userId);
          break;
        default:
          comparison = a.userId.localeCompare(b.userId);
      }

      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });

    return sorted;
  }

  async getNoteCardsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<NoteCardForUrlRawDTO>> {
    try {
      // Get all note cards with the specified URL
      const allCards = this.cardRepository.getAllCards();
      const noteCards = allCards
        .filter((card) => card.isNoteCard && card.url?.value === url)
        .map((card) => ({
          id: card.cardId.getStringValue(),
          note: card.content.noteContent?.text || '',
          authorId: card.curatorId.value,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        }));

      // Sort note cards
      const sortedNotes = this.sortNoteCards(
        noteCards,
        options.sortBy,
        options.sortOrder,
      );

      // Apply pagination
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedNotes = sortedNotes.slice(startIndex, endIndex);

      return {
        items: paginatedNotes,
        totalCount: noteCards.length,
        hasMore: endIndex < noteCards.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to query note cards for URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sortNoteCards(
    notes: NoteCardForUrlRawDTO[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): NoteCardForUrlRawDTO[] {
    const sorted = [...notes].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case CardSortField.CREATED_AT:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case CardSortField.UPDATED_AT:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case CardSortField.LIBRARY_COUNT:
          // For note cards, sort by authorId as fallback
          comparison = a.authorId.localeCompare(b.authorId);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });

    return sorted;
  }

  clear(): void {
    // No separate state to clear
  }
}
