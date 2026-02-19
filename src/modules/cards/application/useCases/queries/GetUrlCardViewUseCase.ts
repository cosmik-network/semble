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
import { ProfileEnricher } from '../../services/ProfileEnricher';

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

      // Get profiles for all users in libraries using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const userIds = cardView.libraries.map((lib) => lib.userId);
      const userProfilesResult = await profileEnricher.buildProfileMap(
        userIds,
        query.callingUserId,
        {
          skipFailures: true, // Skip users with failed profiles
          mapToUser: false, // Use inline profile (without isFollowing)
        },
      );

      if (userProfilesResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch user profiles: ${userProfilesResult.error.message}`,
          ),
        );
      }

      const userProfileMap = userProfilesResult.value;

      // Transform to result format with enriched profile data
      const enrichedLibraries = cardView.libraries
        .map((lib) => {
          const profile = userProfileMap.get(lib.userId);
          if (!profile) {
            return null; // Skip if profile not found
          }

          return {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            bannerUrl: profile.bannerUrl,
            description: profile.description,
          };
        })
        .filter((lib): lib is NonNullable<typeof lib> => lib !== null);

      // Fetch all collections first (without author profiles) - FIX: Parallel fetch
      const collectionsWithData = await Promise.all(
        cardView.collections.map(async (collection) => {
          const collectionIdResult = CollectionId.createFromString(
            collection.id,
          );
          if (collectionIdResult.isErr()) {
            return null;
          }
          const collectionResult = await this.collectionRepo.findById(
            collectionIdResult.value,
          );
          if (collectionResult.isErr() || !collectionResult.value) {
            return null;
          }
          const fullCollection = collectionResult.value;

          return {
            id: collection.id,
            name: collection.name,
            uri: fullCollection.publishedRecordId?.uri,
            description: fullCollection.description?.value,
            accessType: fullCollection.accessType,
            authorId: fullCollection.authorId.value,
            cardCount: fullCollection.cardCount,
            createdAt: fullCollection.createdAt.toISOString(),
            updatedAt: fullCollection.updatedAt.toISOString(),
          };
        }),
      );

      const validCollections = collectionsWithData.filter(
        (c): c is NonNullable<typeof c> => c !== null,
      );

      // Extract unique collection author IDs
      const collectionAuthorIds = [
        ...new Set(validCollections.map((c) => c.authorId)),
      ];

      // Batch fetch all collection author profiles - FIX: Batch instead of sequential
      const collectionAuthorProfilesResult =
        await profileEnricher.buildProfileMap(
          collectionAuthorIds,
          query.callingUserId,
          {
            skipFailures: true,
            mapToUser: false,
          },
        );

      if (collectionAuthorProfilesResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch collection author profiles: ${collectionAuthorProfilesResult.error.message}`,
          ),
        );
      }

      const collectionAuthorProfiles = collectionAuthorProfilesResult.value;

      // Build enriched collections with author profiles
      const enrichedCollections: CollectionDTO[] = validCollections
        .map((collection) => {
          const author = collectionAuthorProfiles.get(collection.authorId);
          if (!author) {
            return null; // Skip collections with missing author
          }

          return {
            id: collection.id,
            uri: collection.uri,
            name: collection.name,
            description: collection.description,
            accessType: collection.accessType,
            author: {
              id: author.id,
              name: author.name,
              handle: author.handle,
              avatarUrl: author.avatarUrl,
              bannerUrl: author.bannerUrl,
              description: author.description,
            },
            cardCount: collection.cardCount,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      const result: UrlCardViewResult = {
        ...cardView,
        author: {
          id: cardAuthor.id,
          name: cardAuthor.name,
          handle: cardAuthor.handle,
          avatarUrl: cardAuthor.avatarUrl,
          bannerUrl: cardAuthor.bannerUrl,
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
