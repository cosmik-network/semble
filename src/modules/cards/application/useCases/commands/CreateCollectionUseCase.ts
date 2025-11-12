import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { ICollectionRepository } from '../../../domain/ICollectionRepository';
import { Collection, CollectionAccessType } from '../../../domain/Collection';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { ICollectionPublisher } from '../../ports/ICollectionPublisher';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export interface CreateCollectionDTO {
  name: string;
  description?: string;
  curatorId: string;
}

export interface CreateCollectionResponseDTO {
  collectionId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class CreateCollectionUseCase
  implements
    UseCase<
      CreateCollectionDTO,
      Result<
        CreateCollectionResponseDTO,
        ValidationError | AuthenticationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private collectionRepository: ICollectionRepository,
    private collectionPublisher: ICollectionPublisher,
  ) {}

  async execute(
    request: CreateCollectionDTO,
  ): Promise<
    Result<
      CreateCollectionResponseDTO,
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

      // Create collection
      const collectionResult = Collection.create({
        authorId: curatorId,
        name: request.name,
        description: request.description,
        accessType: CollectionAccessType.CLOSED,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (collectionResult.isErr()) {
        return err(new ValidationError(collectionResult.error.message));
      }

      const collection = collectionResult.value;

      // Save collection
      const saveResult = await this.collectionRepository.save(collection);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      // Publish collection
      const publishResult = await this.collectionPublisher.publish(collection);
      if (publishResult.isErr()) {
        // Rollback: delete the collection from repository since publishing failed
        const deleteResult = await this.collectionRepository.delete(collection.collectionId);
        if (deleteResult.isErr()) {
          console.error('Failed to rollback collection after publish failure:', deleteResult.error);
        }
        
        // Propagate authentication errors
        if (publishResult.error instanceof AuthenticationError) {
          return err(publishResult.error);
        }
        return err(
          new ValidationError(
            `Failed to publish collection: ${publishResult.error.message}`,
          ),
        );
      }

      // Mark collection as published
      collection.markAsPublished(publishResult.value);

      // Save updated collection with published record ID
      const saveUpdatedResult =
        await this.collectionRepository.save(collection);
      if (saveUpdatedResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveUpdatedResult.error));
      }

      return ok({
        collectionId: collection.collectionId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
