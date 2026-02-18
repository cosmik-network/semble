import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';
import { ActivityTypeEnum } from '../../../domain/value-objects/ActivityType';
import { FeedService } from 'src/modules/feeds/domain/services/FeedService';
import { ICardRepository } from '../../../../cards/domain/ICardRepository';
import { SourceTypeEnum } from '../../../domain/value-objects/SourceType';
import { ATPROTO_NSID } from '../../../../../shared/constants/atproto';
import { IFollowsRepository } from '../../../../user/domain/repositories/IFollowsRepository';
import { IFeedRepository } from '../../../domain/IFeedRepository';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../../../user/domain/value-objects/FollowTargetType';

export interface AddCardCollectedActivityDTO {
  type: ActivityTypeEnum.CARD_COLLECTED;
  actorId: string;
  cardId: string;
  collectionIds?: string[];
  createdAt?: Date; // Timestamp from earliest event (for historical data)
}

export type AddActivityToFeedDTO = AddCardCollectedActivityDTO;

export interface AddActivityToFeedResponseDTO {
  activityId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class AddActivityToFeedUseCase
  implements
    UseCase<
      AddActivityToFeedDTO,
      Result<
        AddActivityToFeedResponseDTO,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private feedService: FeedService,
    private cardRepository: ICardRepository,
    private followsRepository: IFollowsRepository,
    private feedRepository: IFeedRepository,
  ) {}

  async execute(
    request: AddActivityToFeedDTO,
  ): Promise<
    Result<
      AddActivityToFeedResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const actorIdResult = CuratorId.create(request.actorId);
      if (actorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid actor ID: ${actorIdResult.error.message}`,
          ),
        );
      }
      const actorId = actorIdResult.value;

      // Validate and create CardId
      const cardIdResult = CardId.createFromString(request.cardId);
      if (cardIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid card ID: ${cardIdResult.error.message}`),
        );
      }
      const cardId = cardIdResult.value;

      // Validate collection IDs if provided
      let collectionIds: CollectionId[] | undefined;
      if (request.collectionIds && request.collectionIds.length > 0) {
        collectionIds = [];
        for (const collectionIdStr of request.collectionIds) {
          const collectionIdResult =
            CollectionId.createFromString(collectionIdStr);
          if (collectionIdResult.isErr()) {
            return err(
              new ValidationError(
                `Invalid collection ID: ${collectionIdResult.error.message}`,
              ),
            );
          }
          collectionIds.push(collectionIdResult.value);
        }
      }

      // Fetch the card to get its URL type and determine source
      const cardResult = await this.cardRepository.findById(cardId);
      if (cardResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to fetch card: ${cardResult.error.message}`,
          ),
        );
      }

      let urlType;
      let source: string | undefined;

      if (cardResult.value) {
        // Get URL type
        if (cardResult.value.isUrlCard) {
          const urlCardContent = cardResult.value.content;
          if (urlCardContent.urlContent?.metadata?.type) {
            urlType = urlCardContent.urlContent.metadata.type;
          }
        }

        // Determine source from library link's publishedRecordId
        // Only set source if from Margin - Cosmik remains undefined
        const libraryInfo = cardResult.value.getLibraryInfo(actorId);
        if (libraryInfo?.publishedRecordId) {
          const uri = libraryInfo.publishedRecordId.uri;
          if (uri.includes(`/${ATPROTO_NSID.MARGIN.NAMESPACE}.`)) {
            source = SourceTypeEnum.MARGIN;
          }
          // Cosmik activities remain undefined (default)
        }
      }

      // Determine createdAt timestamp for the activity
      // For collections: use the provided timestamp (earliest addedAt from saga)
      // For library-only: use the card's createdAt timestamp
      let createdAt = request.createdAt;
      if (
        !createdAt &&
        cardResult.value &&
        (!collectionIds || collectionIds.length === 0)
      ) {
        // Library-only scenario: use card's creation timestamp
        createdAt = cardResult.value.createdAt;
      }

      const activityResult = await this.feedService.addCardCollectedActivity(
        actorId,
        cardId,
        collectionIds,
        urlType,
        source,
        createdAt,
      );

      if (activityResult.isErr()) {
        return err(new ValidationError(activityResult.error.message));
      }

      const activity = activityResult.value;

      // ========================================
      // PHASE 4: GET FOLLOWERS
      // ========================================

      // 4a. Get followers of the actor (user who created activity)
      const targetTypeResult = FollowTargetType.create(
        FollowTargetTypeEnum.USER,
      );
      if (targetTypeResult.isErr()) {
        console.error(
          'Failed to create FollowTargetType:',
          targetTypeResult.error,
        );
        return ok({
          activityId: activity.activityId.getStringValue(),
        });
      }

      const userFollowersResult = await this.followsRepository.getFollowers(
        actorId.value,
        targetTypeResult.value,
      );

      const userFollowers = userFollowersResult.isOk()
        ? userFollowersResult.value.map((f) => f.followerId.value)
        : [];

      // 4b. Get followers of collections (if any)
      let collectionFollowers: string[] = [];
      if (collectionIds && collectionIds.length > 0) {
        const collectionIdStrings = collectionIds.map((id) =>
          id.getStringValue(),
        );
        const collectionFollowersResult =
          await this.followsRepository.getFollowersOfCollections(
            collectionIdStrings,
          );

        collectionFollowers = collectionFollowersResult.isOk()
          ? collectionFollowersResult.value.map((f) => f.followerId.value)
          : [];
      }

      // 4c. Combine and deduplicate follower IDs
      const allFollowerIds = new Set([
        ...userFollowers,
        ...collectionFollowers,
      ]);

      // ========================================
      // PHASE 5: FAN-OUT
      // ========================================

      if (allFollowerIds.size > 0) {
        const fanOutResult =
          await this.feedRepository.fanOutActivityToFollowers(
            activity.activityId,
            Array.from(allFollowerIds),
            activity.createdAt,
          );

        // Error handling: Log but don't fail the use case
        // Activity already exists in global feed
        // Event retries will eventually distribute it
        if (fanOutResult.isErr()) {
          console.error(
            'Fan-out failed (will retry on event retry):',
            fanOutResult.error,
          );
          // Note: We do NOT return err here - activity was created successfully
        }
      }

      return ok({
        activityId: activity.activityId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
