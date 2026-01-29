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

export interface AddCardCollectedActivityDTO {
  type: ActivityTypeEnum.CARD_COLLECTED;
  actorId: string;
  cardId: string;
  collectionIds?: string[];
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

      const activityResult = await this.feedService.addCardCollectedActivity(
        actorId,
        cardId,
        collectionIds,
        urlType,
        source,
      );

      if (activityResult.isErr()) {
        return err(new ValidationError(activityResult.error.message));
      }

      return ok({
        activityId: activityResult.value.activityId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
