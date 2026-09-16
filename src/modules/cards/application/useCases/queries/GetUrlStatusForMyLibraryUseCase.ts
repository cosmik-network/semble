import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { URL } from '../../../domain/value-objects/URL';
import { CollectionDTO, UrlCard } from '@semble/types';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';

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
    ValidationError | AuthenticationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private cardQueryRepository: ICardQueryRepository,
    private collectionQueryRepository: ICollectionQueryRepository,
    private profileService: IProfileService,
    private followsRepository: IFollowsRepository,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    query: GetUrlStatusForMyLibraryQuery,
  ): Promise<
    Result<
      GetUrlStatusForMyLibraryResult,
      ValidationError | AuthenticationError | AppError.UnexpectedError
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
          // Card author profile and the collections list are independent —
          // fetch them in parallel
          const [authorProfileResult, collections] = await Promise.all([
            this.profileService.getProfile(cardView.authorId, curatorId.value),
            this.collectionQueryRepository.getCollectionsContainingCardForUser(
              card.cardId.getStringValue(),
              curatorId.value,
            ),
          ]);

          if (authorProfileResult.isErr()) {
            return err(
              AppError.UnexpectedError.create(authorProfileResult.error),
            );
          }

          const authorProfile = authorProfileResult.value;

          // Transform to UrlCard format
          result.card = {
            id: cardView.id,
            type: 'URL',
            url: cardView.url,
            uri: cardView.uri,
            cardContent: {
              url: cardView.cardContent.url,
              title: cardView.cardContent.title,
              description: cardView.cardContent.description,
              author: cardView.cardContent.author,
              publishedDate: cardView.cardContent.publishedDate?.toISOString(),
              siteName: cardView.cardContent.siteName,
              imageUrl: cardView.cardContent.imageUrl,
              type: cardView.cardContent.type,
              retrievedAt: cardView.cardContent.retrievedAt?.toISOString(),
              doi: cardView.cardContent.doi,
              isbn: cardView.cardContent.isbn,
            },
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

          // Enrich collections: one batched profile fetch and one batched
          // follow-status query, in parallel
          try {
            const authorIds = [...new Set(collections.map((c) => c.authorId))];
            const [authorProfilesResult, followsResult] = await Promise.all([
              this.profileService.getProfiles(authorIds),
              this.followsRepository.findByFollowerAndTargets(
                curatorId.value,
                collections.map((c) => c.id),
                FollowTargetType.COLLECTION,
              ),
            ]);

            if (authorProfilesResult.isErr()) {
              throw new Error(
                `Failed to fetch author profiles: ${authorProfilesResult.error.message}`,
              );
            }
            const authorProfiles = authorProfilesResult.value;

            const followedCollectionIds = new Set(
              followsResult.isOk()
                ? followsResult.value.map((f) => f.targetId)
                : [],
            );

            result.collections = collections.map(
              (collection): CollectionDTO => {
                const authorProfile = authorProfiles.get(collection.authorId);
                if (!authorProfile) {
                  throw new Error(
                    `Failed to fetch author profile for ${collection.authorId}`,
                  );
                }

                return {
                  id: collection.id,
                  uri: collection.uri,
                  name: collection.name,
                  description: collection.description,
                  accessType: collection.accessType as CollectionDTO['accessType'],
                  author: {
                    id: authorProfile.id,
                    name: authorProfile.name,
                    handle: authorProfile.handle,
                    avatarUrl: authorProfile.avatarUrl,
                    description: authorProfile.bio,
                  },
                  cardCount: collection.cardCount,
                  createdAt: collection.createdAt.toISOString(),
                  updatedAt: collection.updatedAt.toISOString(),
                  isFollowing: followedCollectionIds.has(collection.id),
                };
              },
            );
          } catch (error) {
            // Propagate authentication errors
            if (error instanceof AuthenticationError) {
              return err(error);
            }
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
