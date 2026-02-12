import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { Collection } from '@semble/types';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';

export interface GetFollowingCollectionsQuery {
  userId: string; // DID or handle
  callingUserId?: string;
  page?: number;
  limit?: number;
}

export interface GetFollowingCollectionsResult {
  collections: Collection[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetFollowingCollectionsUseCase
  implements
    UseCase<GetFollowingCollectionsQuery, Result<GetFollowingCollectionsResult>>
{
  constructor(
    private followsRepository: IFollowsRepository,
    private identityResolver: IIdentityResolutionService,
    private profileService: IProfileService,
    private collectionRepository: ICollectionRepository,
  ) {}

  async execute(
    query: GetFollowingCollectionsQuery,
  ): Promise<Result<GetFollowingCollectionsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100

    // Parse and validate user identifier
    const identifierResult = DIDOrHandle.create(query.userId);
    if (identifierResult.isErr()) {
      return err(new ValidationError('Invalid user identifier'));
    }

    // Resolve to DID
    const didResult = await this.identityResolver.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new ValidationError(
          `Could not resolve user identifier: ${didResult.error.message}`,
        ),
      );
    }

    try {
      // Get paginated list of collections that this user follows
      const followsResult = await this.followsRepository.getFollowing(
        didResult.value.value,
        FollowTargetType.COLLECTION,
        { page, limit },
      );

      if (followsResult.isErr()) {
        return err(
          new Error(
            `Failed to retrieve following collections: ${followsResult.error instanceof Error ? followsResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      const { follows, totalCount } = followsResult.value;

      // Extract unique collection IDs
      const uniqueCollectionIds = Array.from(
        new Set(follows.map((follow) => follow.targetId)),
      );

      // Fetch collections
      const collectionPromises = uniqueCollectionIds.map(
        async (collectionId) => {
          const collectionIdResult =
            CollectionId.createFromString(collectionId);
          if (collectionIdResult.isErr()) {
            return null;
          }
          return this.collectionRepository.findById(collectionIdResult.value);
        },
      );

      const collectionResults = await Promise.all(collectionPromises);

      // Fetch author profiles for all collections
      const collectionsMap = new Map<string, any>();
      const authorIds = new Set<string>();

      for (let i = 0; i < uniqueCollectionIds.length; i++) {
        const collectionResult = collectionResults[i];
        const collectionId = uniqueCollectionIds[i];
        if (!collectionResult || !collectionId) {
          continue;
        }
        if (collectionResult.isErr() || !collectionResult.value) {
          console.error(`Failed to fetch collection ${collectionId}`);
          continue;
        }
        const collection = collectionResult.value;
        collectionsMap.set(collectionId, collection);
        authorIds.add(collection.authorId.value);
      }

      // Fetch all author profiles
      const profilePromises = Array.from(authorIds).map((authorId) =>
        this.profileService.getProfile(authorId, query.callingUserId),
      );

      const profileResults = await Promise.all(profilePromises);
      const profileMap = new Map<string, any>();

      const authorIdsArray = Array.from(authorIds);
      for (let i = 0; i < authorIdsArray.length; i++) {
        const profileResult = profileResults[i];
        const authorId = authorIdsArray[i];
        if (!profileResult || !authorId) {
          continue;
        }
        if (profileResult.isErr()) {
          console.error(`Failed to fetch profile for ${authorId}`);
          continue;
        }
        const profile = profileResult.value;
        profileMap.set(authorId, {
          id: profile.id,
          name: profile.name,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
          description: profile.bio,
        });
      }

      // Build collections array in the order of follows (chronological)
      const collections = follows
        .map((follow) => {
          const collection = collectionsMap.get(follow.targetId);
          if (!collection) {
            return null;
          }
          const author = profileMap.get(collection.authorId.value);
          if (!author) {
            return null;
          }
          return {
            id: collection.id.value,
            uri: collection.publishedRecordId?.getValue().uri,
            name: collection.name,
            author,
            description: collection.description,
            accessType: collection.accessType.value,
            cardCount: collection.cardCount,
            createdAt: collection.createdAt.toISOString(),
            updatedAt: collection.updatedAt.toISOString(),
          } as Collection;
        })
        .filter((collection): collection is Collection => collection !== null);

      return ok({
        collections,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: page * limit < totalCount,
          limit,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve following collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
