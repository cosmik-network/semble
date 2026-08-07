import { IFollowPublisher } from '../../../user/application/ports/IFollowPublisher';
import { Follow } from '../../../user/domain/Follow';
import { Result, ok, err } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { AuthenticationError } from '../../../../shared/core/AuthenticationError';

export class ATProtoFollowPublisher implements IFollowPublisher {
  constructor(
    private readonly agentService: IAgentService,
    private readonly followCollection: string, // 'network.cosmik.follow'
    private readonly collectionRepository: ICollectionRepository,
    // applyWrites caps at 200 writes per call; keep batches small to limit
    // the blast radius of a failed call
    private readonly bulkPublishBatchSize: number = 10,
  ) {}

  async publishFollow(
    follow: Follow,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    try {
      const followerDid = DID.create(follow.followerId.value);
      if (followerDid.isErr()) {
        return err(
          new Error(`Invalid follower DID: ${followerDid.error.message}`),
        );
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        followerDid.value,
      );

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Failed to get authenticated agent: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for follower'));
      }

      // Determine the subject based on target type
      let subject: string;
      if (follow.targetType.value === 'USER') {
        // For user follows, subject is the DID
        subject = follow.targetId;
      } else {
        // For collection follows, subject is the AT URI of the published collection
        const collectionIdResult = CollectionId.createFromString(
          follow.targetId,
        );
        if (collectionIdResult.isErr()) {
          return err(
            new Error(
              `Invalid collection ID: ${collectionIdResult.error.message}`,
            ),
          );
        }

        const collectionResult = await this.collectionRepository.findById(
          collectionIdResult.value,
        );
        if (collectionResult.isErr()) {
          return err(
            new Error(
              `Failed to find collection: ${collectionResult.error.message}`,
            ),
          );
        }

        const collection = collectionResult.value;
        if (!collection) {
          return err(new Error('Collection not found'));
        }

        if (!collection.publishedRecordId) {
          return err(
            new Error('Collection must be published before it can be followed'),
          );
        }

        // Use the AT URI of the published collection
        subject = collection.publishedRecordId.uri;
      }

      const record = {
        $type: this.followCollection,
        subject: subject,
        createdAt: follow.createdAt.toISOString(),
      };

      const createResult = await agent.com.atproto.repo.createRecord({
        repo: follow.followerId.value,
        collection: this.followCollection,
        record,
      });

      const publishedRecordId = PublishedRecordId.create({
        uri: createResult.data.uri,
        cid: createResult.data.cid,
      });

      return ok(publishedRecordId);
    } catch (error) {
      return err(
        new Error(
          `Failed to publish follow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async publishFollows(
    follows: Follow[],
  ): Promise<Result<PublishedRecordId[], UseCaseError>> {
    try {
      if (follows.length === 0) {
        return ok([]);
      }

      // Bulk publishing only supports user follows: collection follows need a
      // per-collection AT URI lookup, which the single publishFollow handles.
      const nonUserFollow = follows.find((f) => f.targetType.value !== 'USER');
      if (nonUserFollow) {
        return err(
          new Error('Bulk follow publishing only supports USER targets'),
        );
      }

      const followerId = follows[0]!.followerId.value;
      if (follows.some((f) => f.followerId.value !== followerId)) {
        return err(new Error('All follows must belong to the same follower'));
      }

      const followerDid = DID.create(followerId);
      if (followerDid.isErr()) {
        return err(
          new Error(`Invalid follower DID: ${followerDid.error.message}`),
        );
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        followerDid.value,
      );

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Failed to get authenticated agent: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for follower'));
      }

      const batchSize = Math.min(Math.max(1, this.bulkPublishBatchSize), 200);
      const publishedRecordIds: PublishedRecordId[] = [];

      for (let start = 0; start < follows.length; start += batchSize) {
        const batch = follows.slice(start, start + batchSize);

        const writes = batch.map((follow) => ({
          $type: 'com.atproto.repo.applyWrites#create' as const,
          collection: this.followCollection,
          value: {
            $type: this.followCollection,
            subject: follow.targetId,
            createdAt: follow.createdAt.toISOString(),
          },
        }));

        const applyResult = await agent.com.atproto.repo.applyWrites({
          repo: followerId,
          writes,
        });

        const results = applyResult.data.results ?? [];
        if (results.length !== batch.length) {
          return err(
            new Error(
              `applyWrites returned ${results.length} results for ${batch.length} writes`,
            ),
          );
        }

        for (const result of results) {
          if (
            result.$type !== 'com.atproto.repo.applyWrites#createResult' ||
            !('uri' in result) ||
            !('cid' in result)
          ) {
            return err(
              new Error('applyWrites returned an unexpected result type'),
            );
          }
          publishedRecordIds.push(
            PublishedRecordId.create({
              uri: result.uri,
              cid: result.cid,
            }),
          );
        }
      }

      return ok(publishedRecordIds);
    } catch (error) {
      return err(
        new Error(
          `Failed to publish follows: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async unpublishFollow(follow: Follow): Promise<Result<void, UseCaseError>> {
    try {
      if (!follow.publishedRecordId) {
        // Already unpublished or never published
        return ok(undefined);
      }

      const followerDid = DID.create(follow.followerId.value);
      if (followerDid.isErr()) {
        return err(
          new Error(`Invalid follower DID: ${followerDid.error.message}`),
        );
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        followerDid.value,
      );

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Failed to get authenticated agent: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for follower'));
      }

      // Extract rkey from AT URI (format: at://did/collection/rkey)
      const uriParts = follow.publishedRecordId.uri.split('/');
      const rkey = uriParts[uriParts.length - 1]!;

      await agent.com.atproto.repo.deleteRecord({
        repo: follow.followerId.value,
        collection: this.followCollection,
        rkey,
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to unpublish follow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
