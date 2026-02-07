import {
  ICollectionQueryRepository,
  CollectionQueryOptions,
  CollectionQueryResultDTO,
  CollectionContainingCardDTO,
  CollectionForUrlRawDTO,
  PaginatedQueryResult,
  CollectionSortField,
  SortOrder,
  CollectionForUrlQueryOptions,
  SearchCollectionsOptions,
  GetOpenCollectionsWithContributorOptions,
} from '../../domain/ICollectionQueryRepository';
import { Collection } from '../../domain/Collection';
import { InMemoryCollectionRepository } from './InMemoryCollectionRepository';
import { InMemoryCardRepository } from './InMemoryCardRepository';

export class InMemoryCollectionQueryRepository
  implements ICollectionQueryRepository
{
  constructor(
    private collectionRepository: InMemoryCollectionRepository,
    private cardRepository?: InMemoryCardRepository,
  ) {}

  async findByCreator(
    curatorId: string,
    options: CollectionQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    try {
      const allCollections = this.collectionRepository.getAllCollections();
      let creatorCollections = allCollections.filter(
        (collection) => collection.authorId.value === curatorId,
      );

      if (options.searchText && options.searchText.trim()) {
        const searchTerm = options.searchText.trim().toLowerCase();
        creatorCollections = creatorCollections.filter((collection) => {
          const nameMatch = collection.name.value
            .toLowerCase()
            .includes(searchTerm);
          const descriptionMatch =
            collection.description?.value.toLowerCase().includes(searchTerm) ||
            false;
          return nameMatch || descriptionMatch;
        });
      }

      const sortedCollections = this.sortCollections(
        creatorCollections,
        options.sortBy,
        options.sortOrder,
      );

      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedCollections = sortedCollections.slice(
        startIndex,
        endIndex,
      );

      const items: CollectionQueryResultDTO[] = paginatedCollections.map(
        (collection) => {
          const collectionPublishedRecordId = collection.publishedRecordId;
          return {
            id: collection.collectionId.getStringValue(),
            uri: collectionPublishedRecordId?.uri,
            authorId: collection.authorId.value,
            name: collection.name.value,
            description: collection.description?.value,
            accessType: collection.accessType,
            cardCount: collection.cardCount,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          };
        },
      );

      return {
        items,
        totalCount: creatorCollections.length,
        hasMore: endIndex < creatorCollections.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to query collections: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sortCollections(
    collections: Collection[],
    sortBy: CollectionSortField,
    sortOrder: SortOrder,
  ): Collection[] {
    const sorted = [...collections].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case CollectionSortField.NAME:
          comparison = a.name.value.localeCompare(b.name.value);
          break;
        case CollectionSortField.CREATED_AT:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case CollectionSortField.UPDATED_AT:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case CollectionSortField.CARD_COUNT:
          comparison = a.cardCount - b.cardCount;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });

    return sorted;
  }

  async getCollectionsContainingCardForUser(
    cardId: string,
    curatorId: string,
  ): Promise<CollectionContainingCardDTO[]> {
    try {
      const allCollections = this.collectionRepository.getAllCollections();
      const creatorCollections = allCollections.filter(
        (collection) => collection.authorId.value === curatorId,
      );

      const collectionsWithCard = creatorCollections.filter((collection) =>
        collection.cardLinks.some(
          (link) => link.cardId.getStringValue() === cardId,
        ),
      );

      const result: CollectionContainingCardDTO[] = collectionsWithCard.map(
        (collection) => {
          const collectionPublishedRecordId = collection.publishedRecordId;
          return {
            id: collection.collectionId.getStringValue(),
            uri: collectionPublishedRecordId?.uri,
            name: collection.name.value,
            description: collection.description?.value,
          };
        },
      );

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get collections containing card: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCollectionsWithUrl(
    url: string,
    options: CollectionForUrlQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionForUrlRawDTO>> {
    try {
      if (!this.cardRepository) {
        throw new Error(
          'Card repository is required for getCollectionsWithUrl',
        );
      }

      const allCards = this.cardRepository.getAllCards();
      const cardsWithUrl = allCards.filter(
        (card) => card.isUrlCard && card.url?.value === url,
      );

      const cardIds = new Set(
        cardsWithUrl.map((card) => card.cardId.getStringValue()),
      );

      const allCollections = this.collectionRepository.getAllCollections();
      const collectionsWithUrl = allCollections.filter((collection) =>
        collection.cardLinks.some((link) =>
          cardIds.has(link.cardId.getStringValue()),
        ),
      );

      // Sort collections
      const sortedCollections = this.sortCollections(
        collectionsWithUrl,
        options.sortBy,
        options.sortOrder,
      );

      // Apply pagination
      const { page, limit } = options;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCollections = sortedCollections.slice(
        startIndex,
        endIndex,
      );

      const items: CollectionForUrlRawDTO[] = paginatedCollections.map(
        (collection) => {
          const collectionPublishedRecordId = collection.publishedRecordId;
          return {
            id: collection.collectionId.getStringValue(),
            uri: collectionPublishedRecordId?.uri,
            name: collection.name.value,
            description: collection.description?.value,
            accessType: collection.accessType,
            authorId: collection.authorId.value,
          };
        },
      );

      return {
        items,
        totalCount: sortedCollections.length,
        hasMore: endIndex < sortedCollections.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get collections with URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async searchCollections(
    options: SearchCollectionsOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    try {
      let allCollections = this.collectionRepository.getAllCollections();

      // Apply author filter if provided
      if (options.authorId) {
        allCollections = allCollections.filter(
          (collection) => collection.authorId.value === options.authorId,
        );
      }

      // Apply access type filter if provided
      if (options.accessType) {
        allCollections = allCollections.filter(
          (collection) => collection.accessType === options.accessType,
        );
      }

      // Apply tokenized search if searchText is provided
      if (options.searchText && options.searchText.trim()) {
        const searchWords = options.searchText
          .trim()
          .toLowerCase()
          .split(/\s+/);

        allCollections = allCollections.filter((collection) => {
          const nameText = collection.name.value.toLowerCase();
          const descriptionText =
            collection.description?.value.toLowerCase() || '';
          const combinedText = `${nameText} ${descriptionText}`;

          // All search words must be found (AND logic)
          return searchWords.every((word) => combinedText.includes(word));
        });
      }

      const sortedCollections = this.sortCollections(
        allCollections,
        options.sortBy,
        options.sortOrder,
      );

      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedCollections = sortedCollections.slice(
        startIndex,
        endIndex,
      );

      const items: CollectionQueryResultDTO[] = paginatedCollections.map(
        (collection) => {
          const collectionPublishedRecordId = collection.publishedRecordId;
          return {
            id: collection.collectionId.getStringValue(),
            uri: collectionPublishedRecordId?.uri,
            authorId: collection.authorId.value,
            name: collection.name.value,
            description: collection.description?.value,
            accessType: collection.accessType,
            cardCount: collection.cardCount,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          };
        },
      );

      return {
        items,
        totalCount: allCollections.length,
        hasMore: endIndex < allCollections.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to search collections: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getOpenCollectionsWithContributor(
    options: GetOpenCollectionsWithContributorOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    try {
      const allCollections = this.collectionRepository.getAllCollections();

      // Filter for collections where:
      // 1. User has added cards (via cardLinks.addedBy)
      // 2. User is NOT the author
      // 3. Collection is OPEN
      let contributedCollections = allCollections.filter((collection) => {
        const hasContributed = collection.cardLinks.some(
          (link) => link.addedBy.value === options.contributorId,
        );
        const isNotAuthor = collection.authorId.value !== options.contributorId;
        const isOpen = collection.accessType === 'OPEN';

        return hasContributed && isNotAuthor && isOpen;
      });

      // Sort by most recent contribution first, then by the specified field
      const sortedCollections = [...contributedCollections].sort((a, b) => {
        // Get most recent contribution date for each collection
        const aLastContribution = Math.max(
          ...a.cardLinks
            .filter((link) => link.addedBy.value === options.contributorId)
            .map((link) => link.addedAt.getTime()),
        );
        const bLastContribution = Math.max(
          ...b.cardLinks
            .filter((link) => link.addedBy.value === options.contributorId)
            .map((link) => link.addedAt.getTime()),
        );

        // Primary sort: by most recent contribution (DESC)
        const contributionComparison = bLastContribution - aLastContribution;
        if (contributionComparison !== 0) return contributionComparison;

        // Secondary sort: by the specified field
        let comparison = 0;
        switch (options.sortBy) {
          case CollectionSortField.NAME:
            comparison = a.name.value.localeCompare(b.name.value);
            break;
          case CollectionSortField.CREATED_AT:
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case CollectionSortField.UPDATED_AT:
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case CollectionSortField.CARD_COUNT:
            comparison = a.cardCount - b.cardCount;
            break;
        }
        return options.sortOrder === SortOrder.DESC ? -comparison : comparison;
      });

      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedCollections = sortedCollections.slice(
        startIndex,
        endIndex,
      );

      const items: CollectionQueryResultDTO[] = paginatedCollections.map(
        (collection) => {
          const collectionPublishedRecordId = collection.publishedRecordId;
          return {
            id: collection.collectionId.getStringValue(),
            uri: collectionPublishedRecordId?.uri,
            authorId: collection.authorId.value,
            name: collection.name.value,
            description: collection.description?.value,
            accessType: collection.accessType,
            cardCount: collection.cardCount,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          };
        },
      );

      return {
        items,
        totalCount: sortedCollections.length,
        hasMore: endIndex < sortedCollections.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get open collections with contributor: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  clear(): void {
    // No separate state to clear
  }
}
