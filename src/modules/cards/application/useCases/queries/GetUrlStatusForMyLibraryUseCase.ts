import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { ICollectionRepository } from '../../../domain/ICollectionRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { URL } from '../../../domain/value-objects/URL';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CollectionDTO, UrlCard } from '@semble/types';

export interface GetUrlStatusForMyLibraryQuery {
  url: string;
  curatorId: string;
}

export interface GetUrlStatusForMyLibraryResult {
  card?: UrlCard;
  collections?: CollectionDTO[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetUrlStatusForMyLibraryUseCase extends BaseUseCase<
  GetUrlStatusForMyLibraryQuery,
  Result<
    GetUrlStatusForMyLibraryResult,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private cardQueryRepository: ICardQueryRepository,
    private collectionQueryRepository: ICollectionQueryRepository,
    private collectionRepo: ICollectionRepository,
    private profileService: IProfileService,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    query: GetUrlStatusForMyLibraryQuery,
  ): Promise<
    Result<
      GetUrlStatusForMyLibraryResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(query.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Validate URL
      const urlResult = URL.create(query.url);
      if (urlResult.isErr()) {
        return err(
          new ValidationError(`Invalid URL: ${urlResult.error.message}`),
        );
      }
      const url = urlResult.value;

      // Check if user has a URL card with this URL
      const existingCardResult =
        await this.cardRepository.findUsersUrlCardByUrl(url, curatorId);
      if (existingCardResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingCardResult.error));
      }

      const card = existingCardResult.value;
      const result: GetUrlStatusForMyLibraryResult = {};

      if (card) {
        // Get enriched card data with note
        const cardView = await this.cardQueryRepository.getUrlCardBasic(
          card.cardId.getStringValue(),
          curatorId.value,
        );

        if (cardView) {
          // Get card author profile
          const authorProfileResult = await this.profileService.getProfile(
            cardView.authorId,
            curatorId.value,
          );

          if (authorProfileResult.isErr()) {
            return err(AppError.UnexpectedError.create(authorProfileResult.error));
          }

          const authorProfile = authorProfileResult.value;

          // Transform to UrlCard format
          result.card = {
            id: cardView.id,
            type: 'URL',
            url: cardView.url,
            cardContent: cardView.cardContent,
            libraryCount: cardView.libraryCount,
            urlLibraryCount: cardView.urlLibraryCount,
            urlInLibrary: cardView.urlInLibrary,
            createdAt: cardView.createdAt.toISOString(),
            updatedAt: cardView.updatedAt.toISOString(),
            author: {
              id: authorProfile.id,
              name: authorProfile.name,
              handle: authorProfile.handle,
              avatarUrl: authorProfile.avatarUrl,
              description: authorProfile.bio,
            },
            note: cardView.note, // This includes the note if it exists
          };

          // Get collections containing this card for the user
          try {
            const collections =
              await this.collectionQueryRepository.getCollectionsContainingCardForUser(
                card.cardId.getStringValue(),
                curatorId.value,
              );

            // Enrich collections with full data
            result.collections = await Promise.all(
              collections.map(async (collection): Promise<CollectionDTO> => {
                // Fetch full collection to get dates and cardCount
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

                // Fetch author profile
                const authorProfileResult = await this.profileService.getProfile(
                  fullCollection.authorId.value,
                );
                if (authorProfileResult.isErr()) {
                  throw new Error(
                    `Failed to fetch author profile: ${authorProfileResult.error.message}`,
                  );
                }
                const authorProfile = authorProfileResult.value;

                return {
                  id: collection.id,
                  uri: collection.uri,
                  name: collection.name,
                  description: collection.description,
                  author: {
                    id: authorProfile.id,
                    name: authorProfile.name,
                    handle: authorProfile.handle,
                    avatarUrl: authorProfile.avatarUrl,
                    description: authorProfile.bio,
                  },
                  cardCount: fullCollection.cardCount,
                  createdAt: fullCollection.createdAt.toISOString(),
                  updatedAt: fullCollection.updatedAt.toISOString(),
                };
              }),
            );
          } catch (error) {
            return err(AppError.UnexpectedError.create(error));
          }
        }
      }

      return ok(result);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
