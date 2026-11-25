import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { IConnectionQueryRepository } from '../../../domain/IConnectionQueryRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { CollectionDTO, AnnotationCard } from '@semble/types';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';

export interface GetAnnotationStatusForMyLibraryQuery {
  url: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact: string;
  curatorId: string;
}

export interface GetAnnotationStatusForMyLibraryResult {
  card?: AnnotationCard;
  collections?: CollectionDTO[];
  /** Whether the viewer has a connection where a passage-matching card is an
   * endpoint — the annotation analog of the URL card's urlIsConnected */
  isConnected?: boolean;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetAnnotationStatusForMyLibraryUseCase extends BaseUseCase<
  GetAnnotationStatusForMyLibraryQuery,
  Result<
    GetAnnotationStatusForMyLibraryResult,
    ValidationError | AuthenticationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private cardQueryRepository: ICardQueryRepository,
    private collectionQueryRepository: ICollectionQueryRepository,
    private connectionQueryRepository: IConnectionQueryRepository,
    private profileService: IProfileService,
    private followsRepository: IFollowsRepository,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    query: GetAnnotationStatusForMyLibraryQuery,
  ): Promise<
    Result<
      GetAnnotationStatusForMyLibraryResult,
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

      // Matching key — same normalization the write path stores
      const exactNormalized = normalizeQuotedText(query.exact ?? '');
      if (exactNormalized.length === 0) {
        return err(new ValidationError('exact text is required'));
      }

      // Check if user has annotation cards on this URL matching the passage,
      // and gather every card matching the passage (any author) for the
      // connect-state check — both keyed off the same normalization
      const [existingCardsResult, matchingCardIds] = await Promise.all([
        this.cardRepository.findUsersAnnotationCardsByUrl(url, curatorId),
        this.cardQueryRepository.getMatchingAnnotationCardIds(
          url.value,
          exactNormalized,
        ),
      ]);
      if (existingCardsResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingCardsResult.error));
      }

      // Viewer-relative connect state: the viewer curated a connection where
      // any passage-matching card is an endpoint
      const isConnected =
        await this.connectionQueryRepository.hasConnectionForCards(
          curatorId.value,
          matchingCardIds,
        );

      // A user can only have one annotation card per passage in practice, but
      // nothing enforces it — the most recently updated card represents the
      // passage, and collections are gathered across all matching cards
      const matchingCards = existingCardsResult.value.filter(
        (card) =>
          card.content.annotationContent?.textQuoteSelector?.normalizedExact ===
          exactNormalized,
      );

      const result: GetAnnotationStatusForMyLibraryResult = { isConnected };

      if (matchingCards.length > 0) {
        const representative = [...matchingCards].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        )[0]!;

        const cardView = await this.cardQueryRepository.getAnnotationCardById(
          representative.cardId.getStringValue(),
        );

        if (cardView) {
          // Card author profile and the collections list are independent —
          // fetch them in parallel
          const [authorProfileResult, collections] = await Promise.all([
            this.profileService.getProfile(cardView.authorId, curatorId.value),
            Promise.all(
              matchingCards.map((card) =>
                this.collectionQueryRepository.getCollectionsContainingCardForUser(
                  card.cardId.getStringValue(),
                  curatorId.value,
                ),
              ),
            ).then((perCard) => perCard.flat()),
          ]);

          if (authorProfileResult.isErr()) {
            return err(
              AppError.UnexpectedError.create(authorProfileResult.error),
            );
          }

          const authorProfile = authorProfileResult.value;

          // Transform to AnnotationCard format
          result.card = {
            id: cardView.id,
            type: 'ANNOTATION',
            url: cardView.url,
            uri: cardView.uri,
            libraryCount: cardView.libraryCount,
            connectionCount: cardView.connectionCount,
            selectors: cardView.selectors.map((selector) => ({
              type: selector.type as 'TextQuoteSelector',
              exact: selector.exact,
              prefix: selector.prefix,
              suffix: selector.suffix,
            })),
            note: cardView.note,
            createdAt: cardView.createdAt.toISOString(),
            updatedAt: cardView.updatedAt.toISOString(),
            author: {
              id: authorProfile.id,
              name: authorProfile.name,
              handle: authorProfile.handle,
              avatarUrl: authorProfile.avatarUrl,
              description: authorProfile.bio,
            },
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
                  accessType:
                    collection.accessType as CollectionDTO['accessType'],
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
