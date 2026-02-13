import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { ATUri } from '../../domain/ATUri';
import { Record as FollowRecord } from '../../infrastructure/lexicon/types/network/cosmik/follow';
import { FollowTargetUseCase } from '../../../user/application/useCases/commands/FollowTargetUseCase';
import { UnfollowTargetUseCase } from '../../../user/application/useCases/commands/UnfollowTargetUseCase';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { IFollowsRepository } from '../../../user/domain/repositories/IFollowsRepository';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { DID } from '../../../user/domain/value-objects/DID';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';

export interface ProcessFollowFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: FollowRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;

export class ProcessFollowFirehoseEventUseCase
  implements UseCase<ProcessFollowFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private followTargetUseCase: FollowTargetUseCase,
    private unfollowTargetUseCase: UnfollowTargetUseCase,
    private followsRepository: IFollowsRepository,
    private userRepository: IUserRepository,
    private collectionRepository: ICollectionRepository,
  ) {}

  async execute(request: ProcessFollowFirehoseEventDTO): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing follow event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleFollowCreate(request);
        case 'delete':
          return await this.handleFollowDelete(request);
        case 'update':
          // Updates don't make sense for follows - they're either created or deleted
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Ignoring update event for follow: ${request.atUri}`,
            );
          }
          return ok(undefined);
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleFollowCreate(
    request: ProcessFollowFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Follow create event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract follower DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const atUri = atUriResult.value;
      const followerDid = atUri.did.value;

      // Parse subject to determine target type and ID
      const subject = request.record.subject;
      let targetId: string;
      let targetType: 'USER' | 'COLLECTION';

      if (subject.startsWith('did:')) {
        // Subject is a DID - following a user
        targetType = 'USER';
        targetId = subject;

        // Validate DID format
        const targetDidResult = DID.create(targetId);
        if (targetDidResult.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Invalid target DID: ${targetId} - ${targetDidResult.error.message}`,
            );
          }
          return ok(undefined);
        }

        // Check if target user exists in our system
        const userResult = await this.userRepository.findByDID(
          targetDidResult.value,
        );
        if (userResult.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Error checking user existence: ${userResult.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (!userResult.value) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Target user not found in system, skipping follow: ${targetId}`,
            );
          }
          return ok(undefined);
        }
      } else if (subject.startsWith('at://')) {
        // Subject is an AT URI - following a collection
        targetType = 'COLLECTION';

        // Resolve collection ID from AT URI
        const collectionIdResult =
          await this.atUriResolutionService.resolveCollectionId(subject);
        if (collectionIdResult.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Error resolving collection ID: ${collectionIdResult.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (!collectionIdResult.value) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Target collection not found in system, skipping follow: ${subject}`,
            );
          }
          return ok(undefined);
        }

        targetId = collectionIdResult.value.getStringValue();
      } else {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid subject format (not DID or AT URI): ${subject}`,
          );
        }
        return ok(undefined);
      }

      // Create PublishedRecordId from the firehose event
      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      // Execute follow using FollowTargetUseCase
      // Pass publishedRecordId to skip AT Protocol publishing (already published via firehose)
      const result = await this.followTargetUseCase.execute({
        followerId: followerDid,
        targetId: targetId,
        targetType: targetType,
        publishedRecordId: publishedRecordId,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to process follow - follower: ${followerDid}, target: ${targetId}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully processed follow - follower: ${followerDid}, target: ${targetId}, type: ${targetType}, uri: ${request.atUri}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing follow create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleFollowDelete(
    request: ProcessFollowFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      // Parse AT URI to extract follower DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const followerDid = atUriResult.value.did.value;

      // Resolve the follow record from AT URI to get target info
      const followResult = await this.atUriResolutionService.resolveFollowId(
        request.atUri,
      );
      if (followResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Error resolving follow record: ${followResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (!followResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Follow record not found in system, skipping delete: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      const { targetId, targetType } = followResult.value;

      // Execute unfollow using UnfollowTargetUseCase
      // Skip unpublish since this is a firehose delete event (already deleted from AT Protocol)
      const result = await this.unfollowTargetUseCase.execute({
        followerId: followerDid,
        targetId: targetId,
        targetType: targetType.value as 'USER' | 'COLLECTION',
        skipUnpublish: true,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to process unfollow - follower: ${followerDid}, target: ${targetId}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully processed unfollow - follower: ${followerDid}, target: ${targetId}, uri: ${request.atUri}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing follow delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }
}
