import {
  ICardQueryRepository,
  CardQueryOptions,
  UrlCardQueryResultDTO,
  CollectionCardQueryResultDTO,
  UrlCardViewDTO,
  UrlCardView,
  WithCollections,
  PaginatedQueryResult,
  CardSortField,
  SortOrder,
  LibraryForUrlDTO,
  NoteCardForUrlRawDTO,
  AnnotationCardView,
  AnnotationView,
  ANNOTATION_CARDS_PREVIEW_LIMIT,
  NoteForAnnotationRawDTO,
  LibraryForAnnotationDTO,
  UrlLibraryInfo,
  UrlStats,
  UrlConnectionCounts,
  UserActivityStats,
  SearchUrlsOptions,
  SearchAnnotationsOptions,
  UrlSearchResultDTO,
} from '../../domain/ICardQueryRepository';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { UrlType } from '../../domain/value-objects/UrlType';
import { SelectorTypeEnum } from '../../domain/value-objects/selectors/SelectorType';
import { annotationPassageKey } from '../../domain/value-objects/selectors/normalizeQuotedText';
import { InMemoryCardRepository } from './InMemoryCardRepository';
import { InMemoryCollectionRepository } from './InMemoryCollectionRepository';
import { IConnectionRepository } from '../../domain/IConnectionRepository';
import { Card } from '../../domain/Card';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { URL } from '../../domain/value-objects/URL';

// The in-memory fake only produces URL cards; UrlCardQueryResultDTO is now a
// card-type union, so the URL-only shape gets its own name here
type UrlCardOnlyQueryResultDTO = UrlCardView & WithCollections;

export class InMemoryCardQueryRepository implements ICardQueryRepository {
  constructor(
    private cardRepository: InMemoryCardRepository,
    private collectionRepository: InMemoryCollectionRepository,
    private connectionRepository?: IConnectionRepository,
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

      // Filter by tokenized searchText across title, description, and URL
      if (options.searchText && options.searchText.trim().length > 0) {
        const searchWords = options.searchText
          .trim()
          .toLowerCase()
          .split(/\s+/);
        userCards = userCards.filter((card) => {
          const title =
            card.content.urlContent?.metadata?.title?.toLowerCase() || '';
          const description =
            card.content.urlContent?.metadata?.description?.toLowerCase() || '';
          const url = card.content.urlContent?.url.value.toLowerCase() || '';
          return searchWords.every(
            (word) =>
              title.includes(word) ||
              description.includes(word) ||
              url.includes(word),
          );
        });
      }

      // Filter out cards in collections if uncollected flag is set
      if (options.uncollected) {
        const allCollections = this.collectionRepository.getAllCollections();
        const collectedCardIds = new Set<string>();

        // Find all cards that the user added to any collection
        for (const collection of allCollections) {
          for (const cardLink of collection.cardLinks) {
            if (cardLink.addedBy.value === userId) {
              collectedCardIds.add(cardLink.cardId.getStringValue());
            }
          }
        }

        // Filter out cards that are in collections
        userCards = userCards.filter(
          (card) => !collectedCardIds.has(card.cardId.getStringValue()),
        );
      }

      const userCardResults = await Promise.all(
        userCards.map((card) =>
          this.cardToUrlCardQueryResult(card, callingUserId),
        ),
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

  private async cardToUrlCardQueryResult(
    card: Card,
    callingUserId?: string,
  ): Promise<UrlCardOnlyQueryResultDTO> {
    if (!card.isUrlCard || !card.content.urlContent) {
      throw new Error('Card is not a URL card');
    }

    // Find collections this card belongs to by querying the collection repository
    const allCollections = this.collectionRepository.getAllCollections();
    const collections: {
      id: string;
      name: string;
      authorId: string;
      accessType: string;
    }[] = [];

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

    // Find note card by the same author with matching parent card ID
    const allCards = this.cardRepository.getAllCards();
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

    const url = card.content.urlContent.url.value;

    // Compute urlInLibrary if callingUserId is provided
    const urlInLibrary = callingUserId
      ? this.isUrlInUserLibrary(url, callingUserId)
      : undefined;

    // Get connection count and connection status
    const urlConnectionCount = await this.getUrlConnectionCount(url);
    const urlIsConnected = callingUserId
      ? await this.isUrlConnectedByUser(url, callingUserId)
      : undefined;

    return {
      id: card.cardId.getStringValue(),
      type: CardTypeEnum.URL,
      uri: card.publishedRecordId?.uri,
      url,
      cardContent: {
        url,
        title: card.content.urlContent.metadata?.title,
        description: card.content.urlContent.metadata?.description,
        author: card.content.urlContent.metadata?.author,
        imageUrl: card.content.urlContent.metadata?.imageUrl,
      },
      // Entity-level: mirrors urlLibraryCount until it is phased out
      libraryCount: this.getUrlLibraryCount(url),
      urlLibraryCount: this.getUrlLibraryCount(url),
      urlInLibrary,
      urlConnectionCount,
      urlIsConnected,
      connectionCount: urlConnectionCount,
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

  // Only the counted endpoint must be the URL — the other side may be a CARD
  // endpoint, matching the Drizzle implementation
  private async getUrlConnectionCounts(
    url: string,
  ): Promise<UrlConnectionCounts> {
    const counts: UrlConnectionCounts = {
      forwardTotal: 0,
      backwardTotal: 0,
      forwardByType: new Map(),
      backwardByType: new Map(),
    };
    if (!this.connectionRepository) {
      return counts;
    }

    const urlResult = URL.create(url);
    if (urlResult.isErr()) {
      return counts;
    }
    const urlOrCardIdResult = UrlOrCardId.createFromUrl(urlResult.value);
    if (urlOrCardIdResult.isErr()) {
      return counts;
    }
    const urlOrCardId = urlOrCardIdResult.value;

    const [sourceResult, targetResult] = await Promise.all([
      this.connectionRepository.findBySource(urlOrCardId),
      this.connectionRepository.findByTarget(urlOrCardId),
    ]);
    const forward = sourceResult.isOk() ? sourceResult.value : [];
    const backward = targetResult.isOk() ? targetResult.value : [];

    counts.forwardTotal = forward.length;
    counts.backwardTotal = backward.length;
    for (const conn of forward) {
      if (conn.type) {
        const type = conn.type.value;
        counts.forwardByType.set(
          type,
          (counts.forwardByType.get(type) ?? 0) + 1,
        );
      }
    }
    for (const conn of backward) {
      if (conn.type) {
        const type = conn.type.value;
        counts.backwardByType.set(
          type,
          (counts.backwardByType.get(type) ?? 0) + 1,
        );
      }
    }
    return counts;
  }

  private async getUrlConnectionCount(url: string): Promise<number> {
    const counts = await this.getUrlConnectionCounts(url);
    return counts.forwardTotal + counts.backwardTotal;
  }

  private async isUrlConnectedByUser(
    url: string,
    userId: string,
  ): Promise<boolean> {
    if (!this.connectionRepository) {
      return false;
    }

    try {
      const curatorId = CuratorId.create(userId);
      if (curatorId.isErr()) {
        return false;
      }

      // Get all connections by this curator
      const connectionsResult = await this.connectionRepository.findByCuratorId(
        curatorId.value,
      );
      if (connectionsResult.isErr()) {
        return false;
      }

      const connections = connectionsResult.value;

      // Check if any connection involves this URL (as source or target).
      // The other side may be a URL or a CARD endpoint, matching the
      // Drizzle implementation
      return connections.some(
        (conn) =>
          (conn.source.isUrl && conn.source.url?.value === url) ||
          (conn.target.isUrl && conn.target.url?.value === url),
      );
    } catch (error) {
      return false;
    }
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

      const collectionCardResults = await Promise.all(
        collectionCards.map(async (card) =>
          this.toCollectionCardQueryResult(
            await this.cardToUrlCardQueryResult(card, callingUserId),
          ),
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
    cards: UrlCardView[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): UrlCardView[] {
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
    card: UrlCardOnlyQueryResultDTO,
  ): UrlCardView {
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

    const urlCardResult = await this.cardToUrlCardQueryResult(
      card,
      callingUserId,
    );

    // Get library memberships from the card itself
    const libraries = card.libraryMemberships.map((membership) => ({
      userId: membership.curatorId.value,
    }));

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

    const url = card.content.urlContent!.url.value;

    // Compute urlInLibrary if callingUserId is provided
    const urlInLibrary = callingUserId
      ? this.isUrlInUserLibrary(url, callingUserId)
      : undefined;

    // Get connection count and connection status
    const urlConnectionCount = await this.getUrlConnectionCount(url);
    const urlIsConnected = callingUserId
      ? await this.isUrlConnectedByUser(url, callingUserId)
      : undefined;

    return {
      id: card.cardId.getStringValue(),
      type: CardTypeEnum.URL,
      url,
      cardContent: {
        url,
        title: card.content.urlContent!.metadata?.title,
        description: card.content.urlContent!.metadata?.description,
        author: card.content.urlContent!.metadata?.author,
        imageUrl: card.content.urlContent!.metadata?.imageUrl,
      },
      libraryCount: this.getUrlLibraryCount(url),
      urlLibraryCount: this.getUrlLibraryCount(url),
      urlInLibrary,
      urlConnectionCount,
      urlIsConnected,
      connectionCount: urlConnectionCount,
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
              // Entity-level: mirrors urlLibraryCount until it is phased out
              libraryCount: urlLibraryCount,
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

  private async toAnnotationView(card: Card): Promise<AnnotationCardView> {
    const annotationContent = card.content.annotationContent;
    const url = card.url?.value ?? '';
    const normalizedExact =
      annotationContent?.textQuoteSelector?.normalizedExact;

    // Entity-level counts across all cards matching this passage
    const libraryCount = normalizedExact
      ? this.getMatchingAnnotationLibraryCount(url, normalizedExact)
      : card.libraryCount;
    const connectionCount = normalizedExact
      ? await this.getMatchingAnnotationConnectionCount(url, normalizedExact)
      : 0;

    return {
      id: card.cardId.getStringValue(),
      type: CardTypeEnum.ANNOTATION,
      url,
      libraryCount,
      connectionCount,
      selectors: (annotationContent?.selectors ?? []).map((selector) => ({
        type: 'TextQuoteSelector',
        exact: selector.textQuoteSelector?.exact ?? '',
        prefix: selector.textQuoteSelector?.prefix,
        suffix: selector.textQuoteSelector?.suffix,
      })),
      note: annotationContent?.note,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      authorId: card.curatorId.value,
    };
  }

  private getMatchingAnnotationLibraryCount(
    url: string,
    exactNormalized: string,
  ): number {
    const uniqueUsers = new Set<string>();
    for (const card of this.getMatchingAnnotationCards(url, exactNormalized)) {
      for (const membership of card.libraryMemberships) {
        uniqueUsers.add(membership.curatorId.value);
      }
    }
    return uniqueUsers.size;
  }

  private async getMatchingAnnotationConnectionCount(
    url: string,
    exactNormalized: string,
  ): Promise<number> {
    if (!this.connectionRepository) {
      return 0;
    }

    let count = 0;
    for (const card of this.getMatchingAnnotationCards(url, exactNormalized)) {
      const endpoint = UrlOrCardId.createFromCard(card.cardId).unwrap();
      const [sourceResult, targetResult] = await Promise.all([
        this.connectionRepository.findBySource(endpoint),
        this.connectionRepository.findByTarget(endpoint),
      ]);
      count +=
        (sourceResult.isOk() ? sourceResult.value.length : 0) +
        (targetResult.isOk() ? targetResult.value.length : 0);
    }
    return count;
  }

  // Passage views sort by the passage's own timestamps and counts
  private sortAnnotationViews(
    views: AnnotationView[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): AnnotationView[] {
    const sorted = [...views].sort((a, b) => {
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

  private sortAnnotationCards(
    cards: Card[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
  ): Card[] {
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

  private getMatchingAnnotationCards(
    url: string,
    exactNormalized: string,
  ): Card[] {
    return this.cardRepository
      .getAllCards()
      .filter(
        (card) =>
          card.isAnnotationCard &&
          card.url?.value === url &&
          (card.content.annotationContent?.selectors ?? []).some(
            (selector) =>
              selector.type === SelectorTypeEnum.TEXT_QUOTE &&
              selector.textQuoteSelector?.normalizedExact === exactNormalized,
          ),
      );
  }

  async getAnnotationsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<AnnotationView>> {
    // One entry per unique passage (url + normalized exact), not per card —
    // matching the Drizzle implementation
    const annotationCards = this.cardRepository
      .getAllCards()
      .filter((card) => card.isAnnotationCard && card.url?.value === url);

    const passages = new Map<
      string,
      { cards: Card[]; createdAt: Date; updatedAt: Date }
    >();
    for (const card of annotationCards) {
      const key =
        card.content.annotationContent?.textQuoteSelector?.normalizedExact ??
        '';
      let passage = passages.get(key);
      if (!passage) {
        passage = {
          cards: [],
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        };
        passages.set(key, passage);
      }
      passage.cards.push(card);
      if (card.createdAt < passage.createdAt) {
        passage.createdAt = card.createdAt;
      }
      if (card.updatedAt > passage.updatedAt) {
        passage.updatedAt = card.updatedAt;
      }
    }

    // The representative card — the passage's most recently updated — carries
    // the selectors and the passage's entity-level counts
    const views: AnnotationView[] = await Promise.all(
      [...passages.values()].map(async (passage) => {
        const representative = [...passage.cards].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        )[0]!;
        const cardView = await this.toAnnotationView(representative);
        return {
          id: cardView.id,
          url: cardView.url,
          selectors: cardView.selectors,
          libraryCount: cardView.libraryCount,
          connectionCount: cardView.connectionCount,
          createdAt: passage.createdAt,
          updatedAt: passage.updatedAt,
          // Who saved the passage and their notes — a capped preview, notes
          // first then most recently created
          annotationCards: [...passage.cards]
            .sort((a, b) => {
              const aNote = a.content.annotationContent?.note;
              const bNote = b.content.annotationContent?.note;
              if (!!bNote !== !!aNote) return bNote ? 1 : -1;
              return b.createdAt.getTime() - a.createdAt.getTime();
            })
            .slice(0, ANNOTATION_CARDS_PREVIEW_LIMIT)
            .map((card) => ({
              cardId: card.cardId.getStringValue(),
              userId: card.curatorId.value,
              note: card.content.annotationContent?.note,
              createdAt: card.createdAt,
            })),
        };
      }),
    );

    const sorted = this.sortAnnotationViews(
      views,
      options.sortBy,
      options.sortOrder,
    );

    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;

    return {
      items: sorted.slice(startIndex, endIndex),
      totalCount: sorted.length,
      hasMore: endIndex < sorted.length,
    };
  }

  async getAnnotationCardById(
    cardId: string,
  ): Promise<AnnotationCardView | null> {
    const card = this.cardRepository
      .getAllCards()
      .find((c) => c.isAnnotationCard && c.cardId.getStringValue() === cardId);
    return card ? this.toAnnotationView(card) : null;
  }

  async getBatchAnnotationCardViews(
    cardIds: string[],
  ): Promise<Map<string, AnnotationCardView>> {
    const cardIdSet = new Set(cardIds);
    const viewMap = new Map<string, AnnotationCardView>();
    for (const card of this.cardRepository.getAllCards()) {
      const id = card.cardId.getStringValue();
      if (card.isAnnotationCard && cardIdSet.has(id)) {
        viewMap.set(id, await this.toAnnotationView(card));
      }
    }
    return viewMap;
  }

  async getAnnotationCardsByPassages(
    passages: { url: string; exactNormalized: string }[],
  ): Promise<Map<string, AnnotationCardView[]>> {
    const viewMap = new Map<string, AnnotationCardView[]>();
    const seen = new Set<string>();
    for (const passage of passages) {
      const key = annotationPassageKey(passage.url, passage.exactNormalized);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const matching = await Promise.all(
        this.getMatchingAnnotationCards(
          passage.url,
          passage.exactNormalized,
        ).map((card) => this.toAnnotationView(card)),
      );
      if (matching.length > 0) {
        viewMap.set(key, matching);
      }
    }
    return viewMap;
  }

  async getMatchingAnnotationCardIds(
    url: string,
    exactNormalized: string,
  ): Promise<string[]> {
    return this.getMatchingAnnotationCards(url, exactNormalized).map((card) =>
      card.cardId.getStringValue(),
    );
  }

  async getNotesForAnnotation(
    url: string,
    exactNormalized: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<NoteForAnnotationRawDTO>> {
    const noteCards = this.getMatchingAnnotationCards(url, exactNormalized)
      .filter((card) => (card.content.annotationContent?.note ?? '') !== '')
      .map((card) => ({
        id: card.cardId.getStringValue(),
        note: card.content.annotationContent?.note ?? '',
        authorId: card.curatorId.value,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      }));

    const sortedNotes = this.sortNoteCards(
      noteCards,
      options.sortBy,
      options.sortOrder,
    );

    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;

    return {
      items: sortedNotes.slice(startIndex, endIndex),
      totalCount: sortedNotes.length,
      hasMore: endIndex < sortedNotes.length,
    };
  }

  async getLibrariesForAnnotation(
    url: string,
    exactNormalized: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForAnnotationDTO>> {
    const annotationCards = this.sortAnnotationCards(
      this.getMatchingAnnotationCards(url, exactNormalized),
      options.sortBy,
      options.sortOrder,
    );

    const libraries: LibraryForAnnotationDTO[] = await Promise.all(
      annotationCards.flatMap((card) =>
        card.libraryMemberships.map(async (link) => ({
          userId: link.curatorId.value,
          card: await this.toAnnotationView(card),
        })),
      ),
    );

    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;

    return {
      items: libraries.slice(startIndex, endIndex),
      totalCount: libraries.length,
      hasMore: endIndex < libraries.length,
    };
  }

  async getCardUrlsByIds(cardIds: string[]): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();
    for (const card of this.cardRepository.getAllCards()) {
      const id = card.cardId.getStringValue();
      if (cardIds.includes(id) && card.url) {
        urlMap.set(id, card.url.value);
      }
    }
    return urlMap;
  }

  async getBatchUrlCardViews(
    cardIds: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlCardView>> {
    const resultMap = new Map<string, UrlCardView>();

    for (const cardId of cardIds) {
      const cardView = await this.getUrlCardBasic(cardId, callingUserId);
      if (cardView) {
        resultMap.set(cardId, cardView);
      }
    }

    return resultMap;
  }

  async getBatchUrlLibraryInfo(
    urls: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlLibraryInfo>> {
    const resultMap = new Map<string, UrlLibraryInfo>();

    for (const url of urls) {
      // Get URL library count using existing helper
      const urlLibraryCount = this.getUrlLibraryCount(url);

      // Check if URL is in calling user's library
      const urlInLibrary = callingUserId
        ? this.isUrlInUserLibrary(url, callingUserId)
        : undefined;

      // Get connection count and connection status
      const urlConnectionCount = await this.getUrlConnectionCount(url);
      const urlIsConnected = callingUserId
        ? await this.isUrlConnectedByUser(url, callingUserId)
        : undefined;

      // Get metadata from any card with this URL
      const allCards = this.cardRepository.getAllCards();
      const urlCard = allCards.find(
        (card) => card.isUrlCard && card.url?.value === url,
      );

      const metadata = urlCard?.content.urlContent
        ? {
            url: urlCard.content.urlContent.url.value,
            title: urlCard.content.urlContent.metadata?.title,
            description: urlCard.content.urlContent.metadata?.description,
            author: urlCard.content.urlContent.metadata?.author,
            publishedDate: urlCard.content.urlContent.metadata?.publishedDate,
            siteName: urlCard.content.urlContent.metadata?.siteName,
            imageUrl: urlCard.content.urlContent.metadata?.imageUrl,
            type: urlCard.content.urlContent.metadata?.type,
            retrievedAt: urlCard.content.urlContent.metadata?.retrievedAt,
            doi: urlCard.content.urlContent.metadata?.doi,
            isbn: urlCard.content.urlContent.metadata?.isbn,
          }
        : {
            url,
          };

      resultMap.set(url, {
        urlLibraryCount,
        urlInLibrary,
        urlConnectionCount,
        urlIsConnected,
        metadata,
      });
    }

    return resultMap;
  }

  async getBatchUrlStats(
    urls: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlStats>> {
    const resultMap = new Map<string, UrlStats>();
    const allCards = this.cardRepository.getAllCards();
    const allCollections = this.collectionRepository.getAllCollections();

    for (const url of new Set(urls)) {
      const urlCardIds = new Set(
        allCards
          .filter((card) => card.isUrlCard && card.url?.value === url)
          .map((card) => card.cardId.getStringValue()),
      );

      const noteCount = allCards.filter(
        (card) => card.isNoteCard && card.url?.value === url,
      ).length;

      // Unique annotations (passages) on this URL — its Annotations tab
      // list. Many users saving the same passage count once.
      const annotationCount = new Set(
        allCards
          .filter((card) => card.isAnnotationCard && card.url?.value === url)
          .map(
            (card) =>
              card.content.annotationContent?.textQuoteSelector
                ?.normalizedExact ?? '',
          ),
      ).size;

      const collectionCount = allCollections.filter((collection) =>
        collection.cardLinks.some((link) =>
          urlCardIds.has(link.cardId.getStringValue()),
        ),
      ).length;

      resultMap.set(url, {
        libraryCount: this.getUrlLibraryCount(url),
        noteCount,
        collectionCount,
        annotationCount,
        connections: await this.getUrlConnectionCounts(url),
        urlInLibrary: callingUserId
          ? this.isUrlInUserLibrary(url, callingUserId)
          : undefined,
        urlIsConnected: callingUserId
          ? await this.isUrlConnectedByUser(url, callingUserId)
          : undefined,
      });
    }

    return resultMap;
  }

  async getUsersForUrls(urls: string[]): Promise<string[]> {
    const userIds = new Set<string>();
    const urlSet = new Set(urls);
    const allCards = this.cardRepository.getAllCards();

    allCards.forEach((card) => {
      if (card.isUrlCard && card.url && urlSet.has(card.url.value)) {
        userIds.add(card.curatorId.value);
      }
    });

    if (this.connectionRepository) {
      for (const url of urls) {
        const urlResult = URL.create(url);
        if (urlResult.isErr()) continue;
        const urlOrCardIdResult = UrlOrCardId.createFromUrl(urlResult.value);
        if (urlOrCardIdResult.isErr()) continue;

        const [sourceResult, targetResult] = await Promise.all([
          this.connectionRepository.findBySource(urlOrCardIdResult.value),
          this.connectionRepository.findByTarget(urlOrCardIdResult.value),
        ]);
        if (sourceResult.isOk()) {
          sourceResult.value.forEach((conn) =>
            userIds.add(conn.curatorId.value),
          );
        }
        if (targetResult.isOk()) {
          targetResult.value.forEach((conn) =>
            userIds.add(conn.curatorId.value),
          );
        }
      }
    }

    return Array.from(userIds);
  }

  async getUrlsSavedByUser(
    userId: string,
    urls: string[],
  ): Promise<Set<string>> {
    const urlSet = new Set(urls);
    const savedUrls = new Set<string>();
    const allCards = this.cardRepository.getAllCards();

    allCards.forEach((card) => {
      if (
        card.isUrlCard &&
        card.url &&
        card.curatorId.value === userId &&
        urlSet.has(card.url.value)
      ) {
        savedUrls.add(card.url.value);
      }
    });

    return savedUrls;
  }

  async getUrlTypes(urls: string[]): Promise<Map<string, UrlType>> {
    const urlSet = new Set(urls);
    const urlTypes = new Map<string, UrlType>();
    const allCards = this.cardRepository.getAllCards();

    allCards.forEach((card) => {
      const type = card.content.urlContent?.metadata?.type;
      if (card.isUrlCard && card.url && urlSet.has(card.url.value) && type) {
        urlTypes.set(card.url.value, type);
      }
    });

    return urlTypes;
  }

  async getBatchUserActivityStats(
    userIds: string[],
  ): Promise<Map<string, UserActivityStats>> {
    const resultMap = new Map<string, UserActivityStats>();
    const allCards = this.cardRepository.getAllCards();
    const allCollections = this.collectionRepository.getAllCollections();

    for (const userId of userIds) {
      const stats: UserActivityStats = {
        cardCount: 0,
        collectionCount: 0,
        connectionCount: 0,
        lastActivityAt: null,
      };

      const updateLatest = (date: Date) => {
        if (!stats.lastActivityAt || date > stats.lastActivityAt) {
          stats.lastActivityAt = date;
        }
      };

      allCards.forEach((card) => {
        if (card.curatorId.value === userId) {
          stats.cardCount++;
          updateLatest(card.createdAt);
        }
      });

      allCollections.forEach((collection) => {
        if (collection.authorId.value === userId) {
          stats.collectionCount++;
        }
        collection.cardLinks.forEach((link) => {
          if (link.addedBy.value === userId) {
            updateLatest(link.addedAt);
          }
        });
      });

      if (this.connectionRepository) {
        const curatorIdResult = CuratorId.create(userId);
        if (curatorIdResult.isOk()) {
          const connectionsResult =
            await this.connectionRepository.findByCuratorId(
              curatorIdResult.value,
            );
          if (connectionsResult.isOk()) {
            stats.connectionCount = connectionsResult.value.length;
            connectionsResult.value.forEach((conn) =>
              updateLatest(conn.createdAt),
            );
          }
        }
      }

      resultMap.set(userId, stats);
    }

    return resultMap;
  }

  async getBatchLatestCardCreatedAt(
    userIds: string[],
  ): Promise<Map<string, Date>> {
    const resultMap = new Map<string, Date>();
    const userIdSet = new Set(userIds);

    this.cardRepository.getAllCards().forEach((card) => {
      const userId = card.curatorId.value;
      if (!userIdSet.has(userId)) return;
      const existing = resultMap.get(userId);
      if (!existing || card.createdAt > existing) {
        resultMap.set(userId, card.createdAt);
      }
    });

    return resultMap;
  }

  async searchAnnotations(
    options: SearchAnnotationsOptions,
  ): Promise<PaginatedQueryResult<AnnotationCardView>> {
    const { searchQuery, page, limit, sortBy, sortOrder, urlType, authorDid } =
      options;

    let annotationCards = this.cardRepository
      .getAllCards()
      .filter((card) => card.isAnnotationCard);

    if (authorDid) {
      annotationCards = annotationCards.filter(
        (card) => card.curatorId.value === authorDid.value,
      );
    }

    // Annotations carry no urlType — resolve through the URL's URL cards
    if (urlType) {
      const urlsOfType = new Set(
        this.cardRepository
          .getAllCards()
          .filter(
            (card) =>
              card.isUrlCard &&
              card.url &&
              card.content.urlContent?.metadata?.type === urlType,
          )
          .map((card) => card.url!.value),
      );
      annotationCards = annotationCards.filter(
        (card) => card.url && urlsOfType.has(card.url.value),
      );
    }

    const searchWords = searchQuery.trim().toLowerCase().split(/\s+/);

    const matchingCards = annotationCards.filter((card) => {
      const note = card.content.annotationContent?.note?.toLowerCase() || '';
      const passage = (
        card.content.annotationContent?.textQuoteSelector?.exact || ''
      ).toLowerCase();
      const url = card.url?.value.toLowerCase() || '';

      return searchWords.every(
        (word) =>
          note.includes(word) || passage.includes(word) || url.includes(word),
      );
    });

    // Sort
    const sorted = [...matchingCards].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case CardSortField.CREATED_AT:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case CardSortField.LIBRARY_COUNT:
          comparison = a.libraryCount - b.libraryCount;
          break;
        default:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
      }
      return sortOrder === SortOrder.ASC ? comparison : -comparison;
    });

    const offset = (page - 1) * limit;
    const pageCards = sorted.slice(offset, offset + limit);
    const items = await Promise.all(
      pageCards.map((card) => this.toAnnotationView(card)),
    );

    return {
      items,
      totalCount: sorted.length,
      hasMore: offset + items.length < sorted.length,
    };
  }

  async searchUrls(
    options: SearchUrlsOptions,
  ): Promise<PaginatedQueryResult<UrlSearchResultDTO>> {
    try {
      const { searchQuery, page, limit, sortBy, sortOrder, urlType } = options;

      // Get all URL cards
      const allCards = this.cardRepository.getAllCards();
      let urlCards = allCards.filter((card) => card.isUrlCard);

      // Filter by urlType if specified
      if (urlType) {
        urlCards = urlCards.filter(
          (card) => card.content.urlContent?.metadata?.type === urlType,
        );
      }

      // Tokenize search query into words
      const searchWords = searchQuery.trim().toLowerCase().split(/\s+/);

      // Filter cards by tokenized substring search
      const matchingCards = urlCards.filter((card) => {
        const title =
          card.content.urlContent?.metadata?.title?.toLowerCase() || '';
        const description =
          card.content.urlContent?.metadata?.description?.toLowerCase() || '';
        const url = card.content.urlContent?.url.value.toLowerCase() || '';

        // All words must match somewhere in title, description, or url
        return searchWords.every((word) => {
          return (
            title.includes(word) ||
            description.includes(word) ||
            url.includes(word)
          );
        });
      });

      // Deduplicate by URL - keep most recent card per URL
      const urlMap = new Map<
        string,
        { card: Card; contentData: any; updatedAt: Date }
      >();

      matchingCards.forEach((card) => {
        const url = card.content.urlContent?.url.value;
        if (!url) return;

        const existing = urlMap.get(url);
        if (
          !existing ||
          card.updatedAt.getTime() > existing.updatedAt.getTime()
        ) {
          // Build contentData from card
          const contentData = {
            url: card.content.urlContent?.url.value,
            metadata: card.content.urlContent?.metadata
              ? {
                  url: card.content.urlContent.metadata.url,
                  title: card.content.urlContent.metadata.title,
                  description: card.content.urlContent.metadata.description,
                  author: card.content.urlContent.metadata.author,
                  publishedDate: card.content.urlContent.metadata.publishedDate,
                  siteName: card.content.urlContent.metadata.siteName,
                  imageUrl: card.content.urlContent.metadata.imageUrl,
                  type: card.content.urlContent.metadata.type,
                  retrievedAt: card.content.urlContent.metadata.retrievedAt,
                  doi: card.content.urlContent.metadata.doi,
                  isbn: card.content.urlContent.metadata.isbn,
                }
              : undefined,
          };

          urlMap.set(url, {
            card,
            contentData,
            updatedAt: card.updatedAt,
          });
        }
      });

      // Convert to array
      const uniqueUrls = Array.from(urlMap.entries()).map(([url, data]) => ({
        url,
        contentData: data.contentData,
        updatedAt: data.updatedAt,
        card: data.card,
      }));

      // For LIBRARY_COUNT sorting, calculate library counts
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        const itemsWithCounts = uniqueUrls.map((item) => {
          // Use the existing helper method to get library count
          const libraryCount = this.getUrlLibraryCount(item.url);

          return {
            ...item,
            libraryCount,
          };
        });

        // Sort by library count
        itemsWithCounts.sort((a, b) => {
          const comparison = a.libraryCount - b.libraryCount;
          return sortOrder === SortOrder.ASC ? comparison : -comparison;
        });

        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = itemsWithCounts.slice(startIndex, endIndex);

        return {
          items: paginatedItems.map((item) => ({
            url: item.url,
            contentData: item.contentData,
            updatedAt: item.updatedAt,
          })),
          totalCount: itemsWithCounts.length,
          hasMore: endIndex < itemsWithCounts.length,
        };
      }

      // For other sort fields (CREATED_AT, UPDATED_AT)
      uniqueUrls.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case CardSortField.CREATED_AT:
            comparison =
              a.card.createdAt.getTime() - b.card.createdAt.getTime();
            break;
          case CardSortField.UPDATED_AT:
          default:
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
        }

        return sortOrder === SortOrder.ASC ? comparison : -comparison;
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUrls = uniqueUrls.slice(startIndex, endIndex);

      return {
        items: paginatedUrls.map((item) => ({
          url: item.url,
          contentData: item.contentData,
          updatedAt: item.updatedAt,
        })),
        totalCount: uniqueUrls.length,
        hasMore: endIndex < uniqueUrls.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to search URLs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getProfileCardStats(authorId: string): Promise<{
    urlCardCount: number;
    annotationCardCount: number;
  }> {
    const allCards = this.cardRepository.getAllCards();

    // Count URL and annotation cards authored by this user — the two types
    // the profile Cards tab lists. NOTE cards are excluded.
    const authored = allCards.filter((c) => c.curatorId.value === authorId);
    const urlCardCount = authored.filter((c) => c.type.value === 'URL').length;
    const annotationCardCount = authored.filter(
      (c) => c.type.value === 'ANNOTATION',
    ).length;

    return {
      urlCardCount,
      annotationCardCount,
    };
  }

  clear(): void {
    // No separate state to clear
  }
}
