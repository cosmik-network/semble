import { IConnectionPublisher } from 'src/modules/cards/application/ports/IConnectionPublisher';
import { ICardRepository } from 'src/modules/cards/domain/ICardRepository';
import { Connection } from 'src/modules/cards/domain/Connection';
import { UrlOrCardId } from 'src/modules/cards/domain/value-objects/UrlOrCardId';
import { Result, ok, err } from 'src/shared/core/Result';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { ConnectionMapper } from '../mappers/ConnectionMapper';
import { StrongRef } from '../../domain';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';

export class ATProtoConnectionPublisher implements IConnectionPublisher {
  constructor(
    private readonly agentService: IAgentService,
    private readonly connectionCollection: string,
    private readonly cardRepository: ICardRepository,
  ) {}

  /**
   * The card's AT URI for a CARD endpoint — the card's own published record,
   * the same card-id→AT-URI conversion collection links do. It's also what
   * AtUriResolutionService.resolveCardId resolves back to a card id on
   * firehose ingestion. Undefined for URL endpoints, unknown cards, or cards
   * without a published record (the mapper then falls back to the local id).
   */
  private async cardRecordUri(
    endpoint: UrlOrCardId,
  ): Promise<string | undefined> {
    if (!endpoint.isCard || !endpoint.cardId) {
      return undefined;
    }
    const cardResult = await this.cardRepository.findById(endpoint.cardId);
    if (cardResult.isErr() || !cardResult.value) {
      console.warn(
        `ATProtoConnectionPublisher: CARD endpoint ${endpoint.cardId.getStringValue()} does not resolve to a card; publishing the local id`,
      );
      return undefined;
    }
    return cardResult.value.publishedRecordId?.getValue().uri;
  }

  async publish(
    connection: Connection,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    try {
      const curatorDidResult = DID.create(connection.curatorId.value);

      if (curatorDidResult.isErr()) {
        return err(
          new Error(`Invalid curator DID: ${curatorDidResult.error.message}`),
        );
      }

      const curatorDid = curatorDidResult.value;

      // Get an authenticated agent for this curator
      const agentResult =
        await this.agentService.getAuthenticatedAgent(curatorDid);

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Authentication error for ATProtoConnectionPublisher: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      // CARD endpoints reference the card's AT URI, not the local card id
      const [sourceCardUri, targetCardUri] = await Promise.all([
        this.cardRecordUri(connection.source),
        this.cardRecordUri(connection.target),
      ]);

      if (connection.publishedRecordId) {
        // Update existing connection record
        const connectionRecordDTO = ConnectionMapper.toCreateRecordDTO(
          connection,
          { source: sourceCardUri, target: targetCardUri },
        );
        connectionRecordDTO.$type = this.connectionCollection as any;

        const publishedRecordId = connection.publishedRecordId.getValue();
        const strongRef = new StrongRef(publishedRecordId);
        const atUri = strongRef.atUri;
        const rkey = atUri.rkey;

        const updateResult = await agent.com.atproto.repo.putRecord({
          repo: curatorDid.value,
          collection: this.connectionCollection,
          rkey: rkey,
          record: connectionRecordDTO,
        });

        return ok(
          PublishedRecordId.create({
            uri: updateResult.data.uri,
            cid: updateResult.data.cid,
          }),
        );
      } else {
        // Create new connection record
        const connectionRecordDTO = ConnectionMapper.toCreateRecordDTO(
          connection,
          { source: sourceCardUri, target: targetCardUri },
        );
        connectionRecordDTO.$type = this.connectionCollection as any;

        const createResult = await agent.com.atproto.repo.createRecord({
          repo: curatorDid.value,
          collection: this.connectionCollection,
          record: connectionRecordDTO,
        });

        return ok(
          PublishedRecordId.create({
            uri: createResult.data.uri,
            cid: createResult.data.cid,
          }),
        );
      }
    } catch (error) {
      return err(
        new Error(error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async unpublish(
    recordId: PublishedRecordId,
  ): Promise<Result<void, UseCaseError>> {
    try {
      const publishedRecordId = recordId.getValue();
      const strongRef = new StrongRef(publishedRecordId);
      const atUri = strongRef.atUri;
      const curatorDid = atUri.did;
      const repo = atUri.did.toString();
      const rkey = atUri.rkey;

      // Get an authenticated agent for this curator
      const agentResult =
        await this.agentService.getAuthenticatedAgent(curatorDid);

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new Error(
            `Authentication error for ATProtoConnectionPublisher: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      await agent.com.atproto.repo.deleteRecord({
        repo,
        collection: this.connectionCollection,
        rkey,
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
