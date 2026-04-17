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
  CollectionContributorDTO,
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

      // For ADDED_AT sorting, we need to track the max addedAt for each collection
      let sortedCollections: Collection[];
      if (options.sortBy === CollectionSortField.ADDED_AT) {
        // Create a map of collection -> max addedAt from the matching cards
        const collectionAddedAtMap = new Map<string, Date>();

        for (const collection of collectionsWithUrl) {
          const matchingCardLinks = collection.cardLinks.filter((link) =>
            cardIds.has(link.cardId.getStringValue()),
          );

          if (matchingCardLinks.length > 0) {
            const maxAddedAt = matchingCardLinks.reduce((max, link) => {
              return link.addedAt > max ? link.addedAt : max;
            }, matchingCardLinks[0]!.addedAt);

            collectionAddedAtMap.set(
              collection.collectionId.getStringValue(),
              maxAddedAt,
            );
          }
        }

        // Sort by the max addedAt
        sortedCollections = [...collectionsWithUrl].sort((a, b) => {
          const aAddedAt = collectionAddedAtMap.get(
            a.collectionId.getStringValue(),
          )!;
          const bAddedAt = collectionAddedAtMap.get(
            b.collectionId.getStringValue(),
          )!;

          const comparison = aAddedAt.getTime() - bAddedAt.getTime();
          return options.sortOrder === SortOrder.DESC
            ? -comparison
            : comparison;
        });
      } else {
        // Use the standard sorting method for other fields
        sortedCollections = this.sortCollections(
          collectionsWithUrl,
          options.sortBy,
          options.sortOrder,
        );
      }

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

  async getCollectionContributors(
    collectionId: string,
    authorId: string,
    options: { page: number; limit: number },
  ): Promise<PaginatedQueryResult<CollectionContributorDTO>> {
    try {
      const allCollections = this.collectionRepository.getAllCollections();
      const collection = allCollections.find(
        (c) => c.collectionId.getStringValue() === collectionId,
      );

      if (!collection) {
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // Get unique contributors (excluding author) with their contribution counts
      const contributorMap = new Map<
        string,
        { userId: string; contributionCount: number; lastContributedAt: Date }
      >();

      for (const link of collection.cardLinks) {
        const contributorId = link.addedBy.value;

        // Skip the collection author
        if (contributorId === authorId) {
          continue;
        }

        if (contributorMap.has(contributorId)) {
          const existing = contributorMap.get(contributorId)!;
          existing.contributionCount++;
          if (link.addedAt > existing.lastContributedAt) {
            existing.lastContributedAt = link.addedAt;
          }
        } else {
          contributorMap.set(contributorId, {
            userId: contributorId,
            contributionCount: 1,
            lastContributedAt: link.addedAt,
          });
        }
      }

      // Convert to array and sort by most recent contribution
      let contributors = Array.from(contributorMap.values()).sort(
        (a, b) => b.lastContributedAt.getTime() - a.lastContributedAt.getTime(),
      );

      const totalCount = contributors.length;

      // Apply pagination
      const { page, limit } = options;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      contributors = contributors.slice(startIndex, endIndex);

      return {
        items: contributors,
        totalCount,
        hasMore: endIndex < totalCount,
      };
    } catch (error) {
      throw new Error(
        `Failed to get collection contributors: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCollectionCountForUrl(url: string): Promise<number> {
    const allCards = this.cardRepository?.getAllCards() || [];
    const allCollections = this.collectionRepository?.getAllCollections() || [];

    // Find all URL cards with this URL
    const urlCards = allCards.filter(
      (c) => c.type.value === 'URL' && c.url?.value === url,
    );
    const urlCardIds = new Set(urlCards.map((c) => c.cardId.getStringValue()));

    // Count collections that contain any of these URL cards
    const collectionsWithUrl = new Set<string>();
    allCollections.forEach((collection) => {
      for (const cardInCollection of collection.cardIds) {
        if (urlCardIds.has(cardInCollection.getStringValue())) {
          collectionsWithUrl.add(collection.collectionId.getStringValue());
          break;
        }
      }
    });

    return collectionsWithUrl.size;
  }

  async getProfileCollectionCount(authorId: string): Promise<number> {
    const allCollections = this.collectionRepository?.getAllCollections() || [];

    // Count collections created by this user
    const collectionCount = allCollections.filter(
      (c) => c.authorId.value === authorId,
    ).length;

    return collectionCount;
  }

  clear(): void {
    // No separate state to clear
  }
}
