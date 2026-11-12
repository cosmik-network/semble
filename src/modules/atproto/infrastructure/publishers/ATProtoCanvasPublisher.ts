import {
  CanvasPublishFields,
  ICanvasPublisher,
} from 'src/modules/canvas/application/ports/ICanvasPublisher';
import { Result, ok, err } from 'src/shared/core/Result';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { StrongRef } from '../../domain';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';

export class ATProtoCanvasPublisher implements ICanvasPublisher {
  constructor(
    private readonly agentService: IAgentService,
    private readonly canvasCollection: string,
    // Where the webapp serves /canvas/:id; the record points at it so the
    // board is discoverable and openable from the PDS copy
    private readonly appUrl: string,
  ) {}

  async publish(
    ownerDid: string,
    canvas: CanvasPublishFields,
    existingRecordId?: PublishedRecordId,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    try {
      const curatorDidResult = DID.create(ownerDid);
      if (curatorDidResult.isErr()) {
        return err(
          new Error(`Invalid owner DID: ${curatorDidResult.error.message}`),
        );
      }
      const curatorDid = curatorDidResult.value;

      const agentResult =
        await this.agentService.getAuthenticatedAgent(curatorDid);
      if (agentResult.isErr()) {
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Authentication error for ATProtoCanvasPublisher: ${agentResult.error.message}`,
          ),
        );
      }
      const agent = agentResult.value;
      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      const record = {
        $type: this.canvasCollection as any,
        name: canvas.name,
        url: `${this.appUrl}/canvas/${canvas.canvasId}`,
        createdAt: canvas.createdAt,
        updatedAt: new Date().toISOString(),
      };

      if (existingRecordId) {
        const atUri = new StrongRef(existingRecordId.getValue()).atUri;
        const updateResult = await agent.com.atproto.repo.putRecord({
          repo: curatorDid.value,
          collection: this.canvasCollection,
          rkey: atUri.rkey,
          record,
        });
        return ok(
          PublishedRecordId.create({
            uri: updateResult.data.uri,
            cid: updateResult.data.cid,
          }),
        );
      }

      const createResult = await agent.com.atproto.repo.createRecord({
        repo: curatorDid.value,
        collection: this.canvasCollection,
        record,
      });
      return ok(
        PublishedRecordId.create({
          uri: createResult.data.uri,
          cid: createResult.data.cid,
        }),
      );
    } catch (error) {
      return err(
        new Error(error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async unpublish(
    recordId: PublishedRecordId,
    ownerDid: string,
  ): Promise<Result<void, UseCaseError>> {
    try {
      const atUri = new StrongRef(recordId.getValue()).atUri;
      const curatorDidResult = DID.create(ownerDid);
      if (curatorDidResult.isErr()) {
        return err(
          new Error(`Invalid owner DID: ${curatorDidResult.error.message}`),
        );
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        curatorDidResult.value,
      );
      if (agentResult.isErr()) {
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Authentication error for ATProtoCanvasPublisher: ${agentResult.error.message}`,
          ),
        );
      }
      const agent = agentResult.value;
      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      await agent.com.atproto.repo.deleteRecord({
        repo: ownerDid,
        collection: this.canvasCollection,
        rkey: atUri.rkey,
      });
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
