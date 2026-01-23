import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { ICollectionRepository } from '../../../domain/ICollectionRepository';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { ICollectionPublisher } from '../../ports/ICollectionPublisher';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { CollectionAccessType } from '../../../domain/Collection';

export interface UpdateCollectionDTO {
  collectionId: string;
  name: string;
  description?: string;
  accessType?: CollectionAccessType;
  curatorId: string;
  publishedRecordId?: PublishedRecordId; // For firehose events - skip republishing if provided
}

export interface UpdateCollectionResponseDTO {
  collectionId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UpdateCollectionUseCase
  implements
    UseCase<
      UpdateCollectionDTO,
      Result<
        UpdateCollectionResponseDTO,
        ValidationError | AuthenticationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private collectionRepository: ICollectionRepository,
    private collectionPublisher: ICollectionPublisher,
  ) {}

  async execute(
    request: UpdateCollectionDTO,
  ): Promise<
    Result<
      UpdateCollectionResponseDTO,
      ValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(request.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Validate and create CollectionId
      const collectionIdResult = CollectionId.createFromString(
        request.collectionId,
      );
      if (collectionIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid collection ID: ${collectionIdResult.error.message}`,
          ),
        );
      }
      const collectionId = collectionIdResult.value;

      // Find the collection
      const collectionResult =
        await this.collectionRepository.findById(collectionId);
      if (collectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(collectionResult.error));
      }

      const collection = collectionResult.value;
      if (!collection) {
        return err(
          new ValidationError(`Collection not found: ${request.collectionId}`),
        );
      }

      // Check if user is the author
      if (!collection.authorId.equals(curatorId)) {
        return err(
          new ValidationError(
            'Only the collection author can update the collection',
          ),
        );
      }

      // Update collection details using domain method
      const updateResult = collection.updateDetails(
        request.name,
        request.description,
      );
      if (updateResult.isErr()) {
        return err(new ValidationError(updateResult.error.message));
      }

      // Update accessType if provided
      if (request.accessType !== undefined) {
        const accessTypeResult = collection.changeAccessType(
          request.accessType,
          curatorId,
        );
        if (accessTypeResult.isErr()) {
          return err(new ValidationError(accessTypeResult.error.message));
        }
      }

      // Handle republishing - skip if publishedRecordId provided (firehose event)
      if (request.publishedRecordId) {
        // Update published record ID with provided value
        collection.markAsPublished(request.publishedRecordId);

        // Save collection with updated published record ID
        const saveUpdatedResult =
          await this.collectionRepository.save(collection);
        if (saveUpdatedResult.isErr()) {
          return err(AppError.UnexpectedError.create(saveUpdatedResult.error));
        }
      } else if (collection.isPublished) {
        // Republish collection normally
        const republishResult =
          await this.collectionPublisher.publish(collection);
        if (republishResult.isErr()) {
          // Propagate authentication errors
          if (republishResult.error instanceof AuthenticationError) {
            return err(republishResult.error);
          }
          return err(
            new ValidationError(
              `Failed to republish collection: ${republishResult.error.message}`,
            ),
          );
        }

        // Update published record ID
        collection.markAsPublished(republishResult.value);

        // Save collection with updated published record ID
        const saveUpdatedResult =
          await this.collectionRepository.save(collection);
        if (saveUpdatedResult.isErr()) {
          return err(AppError.UnexpectedError.create(saveUpdatedResult.error));
        }
      }

      return ok({
        collectionId: collection.collectionId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
