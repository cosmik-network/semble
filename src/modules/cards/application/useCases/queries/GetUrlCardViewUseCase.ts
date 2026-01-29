import { CardId } from 'src/modules/cards/domain/value-objects/CardId';
import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  ICardQueryRepository,
  UrlCardView,
  WithCollections,
} from '../../../domain/ICardQueryRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { ICollectionRepository } from '../../../domain/ICollectionRepository';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { UserProfileDTO, CollectionDTO } from '@semble/types';

export interface GetUrlCardViewQuery {
  cardId: string;
  callingUserId?: string;
}

// Enriched data for the final use case result
export type UrlCardViewResult = UrlCardView & {
  author: UserProfileDTO;
  collections: CollectionDTO[];
  libraries: UserProfileDTO[];
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CardNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardNotFoundError';
  }
}

export class GetUrlCardViewUseCase
  implements UseCase<GetUrlCardViewQuery, Result<UrlCardViewResult>>
{
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
    private collectionRepo: ICollectionRepository,
  ) {}

  async execute(
    query: GetUrlCardViewQuery,
  ): Promise<Result<UrlCardViewResult>> {
    // Validate card ID
    const cardIdResult = CardId.createFromString(query.cardId);
    if (cardIdResult.isErr()) {
      return err(new ValidationError('Invalid card ID'));
    }

    try {
      // Get the URL card view data
      const cardView = await this.cardQueryRepo.getUrlCardView(
        query.cardId,
        query.callingUserId,
      );

      if (!cardView) {
        return err(new CardNotFoundError('URL card not found'));
      }

      // Fetch card author profile
      const cardAuthorResult = await this.profileService.getProfile(
        cardView.authorId,
        query.callingUserId,
      );

      if (cardAuthorResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch card author: ${cardAuthorResult.error.message}`,
          ),
        );
      }

      const cardAuthor = cardAuthorResult.value;

      // Get profiles for all users in libraries
      const userIds = cardView.libraries.map((lib) => lib.userId);
      const profilePromises = userIds.map((userId) =>
        this.profileService.getProfile(userId, query.callingUserId),
      );

      const profileResults = await Promise.all(profilePromises);

      // Check if any profile fetches failed
      const failedProfiles = profileResults.filter((result) => result.isErr());
      if (failedProfiles.length > 0) {
        const firstError = failedProfiles[0]!.error;
        return err(
          new Error(
            `Failed to fetch user profiles: ${firstError instanceof Error ? firstError.message : 'Unknown error'}`,
          ),
        );
      }

      // Transform to result format with enriched profile data
      const enrichedLibraries = cardView.libraries.map((lib, index) => {
        const profileResult = profileResults[index]!;
        if (profileResult.isErr()) {
          throw new Error(
            `Failed to fetch profile for user ${lib.userId}: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
          );
        }
        const profile = profileResult.value;

        return {
          id: profile.id,
          name: profile.name,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
          description: profile.bio,
        };
      });

      // Enrich collections with full Collection data
      const enrichedCollections: CollectionDTO[] = await Promise.all(
        cardView.collections.map(async (collection) => {
          const collectionIdResult = CollectionId.createFromString(
            collection.id,
          );
          if (collectionIdResult.isErr()) {
            throw new Error(`Invalid collection ID: ${collection.id}`);
          }
          const collectionResult = await this.collectionRepo.findById(
            collectionIdResult.value,
          );
          if (collectionResult.isErr() || !collectionResult.value) {
            throw new Error(`Collection not found: ${collection.id}`);
          }
          const fullCollection = collectionResult.value;

          // Fetch collection author profile
          const collectionAuthorResult = await this.profileService.getProfile(
            fullCollection.authorId.value,
            query.callingUserId,
          );
          if (collectionAuthorResult.isErr()) {
            throw new Error(
              `Failed to fetch collection author: ${collectionAuthorResult.error.message}`,
            );
          }
          const collectionAuthor = collectionAuthorResult.value;

          return {
            id: collection.id,
            uri: fullCollection.publishedRecordId?.uri,
            name: collection.name,
            description: fullCollection.description?.value,
            accessType: fullCollection.accessType,
            author: {
              id: collectionAuthor.id,
              name: collectionAuthor.name,
              handle: collectionAuthor.handle,
              avatarUrl: collectionAuthor.avatarUrl,
              description: collectionAuthor.bio,
            },
            cardCount: fullCollection.cardCount,
            createdAt: fullCollection.createdAt.toISOString(),
            updatedAt: fullCollection.updatedAt.toISOString(),
          };
        }),
      );

      const result: UrlCardViewResult = {
        ...cardView,
        author: {
          id: cardAuthor.id,
          name: cardAuthor.name,
          handle: cardAuthor.handle,
          avatarUrl: cardAuthor.avatarUrl,
          description: cardAuthor.bio,
        },
        collections: enrichedCollections,
        libraries: enrichedLibraries,
      };

      return ok(result);
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve URL card view: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
