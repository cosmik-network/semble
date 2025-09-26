import { ICollectionPublisher } from 'src/modules/cards/application/ports/ICollectionPublisher';
import { Collection } from 'src/modules/cards/domain/Collection';
import { Card } from 'src/modules/cards/domain/Card';
import { Result, ok, err } from 'src/shared/core/Result';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { CuratorId } from 'src/modules/cards/domain/value-objects/CuratorId';
import { CollectionMapper } from '../mappers/CollectionMapper';
import { CollectionLinkMapper } from '../mappers/CollectionLinkMapper';
import { StrongRef } from '../../domain';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';

export class ATProtoCollectionPublisher implements ICollectionPublisher {
  private readonly COLLECTION_COLLECTION = 'network.cosmik.collection';
  private readonly COLLECTION_LINK_COLLECTION = 'network.cosmik.collectionLink';

  constructor(private readonly agentService: IAgentService) {}

  /**
   * Publishes a Collection record only (not the card links)
   */
  async publish(
    collection: Collection,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    try {
      const curatorDidResult = DID.create(collection.authorId.value);

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
        return err(
          new Error(`Authentication error: ${agentResult.error.message}`),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      if (collection.publishedRecordId) {
        // Update existing collection record
        const collectionRecordDTO =
          CollectionMapper.toCreateRecordDTO(collection);

        const publishedRecordId = collection.publishedRecordId.getValue();
        const strongRef = new StrongRef(publishedRecordId);
        const atUri = strongRef.atUri;
        const rkey = atUri.rkey;

        await agent.com.atproto.repo.putRecord({
          repo: curatorDid.value,
          collection: this.COLLECTION_COLLECTION,
          rkey: rkey,
          record: collectionRecordDTO,
        });

        return ok(collection.publishedRecordId);
      } else {
        // Create new collection record
        const collectionRecordDTO =
          CollectionMapper.toCreateRecordDTO(collection);

        const createResult = await agent.com.atproto.repo.createRecord({
          repo: curatorDid.value,
          collection: this.COLLECTION_COLLECTION,
          record: collectionRecordDTO,
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

  /**
   * Publishes a card-in-collection link when a card is added to a collection
   */
  async publishCardAddedToCollection(
    card: Card,
    collection: Collection,
    curatorId: CuratorId,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    try {
      const curatorDidResult = DID.create(curatorId.value);

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
        return err(
          new Error(`Authentication error: ${agentResult.error.message}`),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      // Ensure collection is published
      if (!collection.publishedRecordId) {
        return err(
          new Error('Collection must be published before adding cards'),
        );
      }

      // Get the card's library membership for this curator
      const libraryMembership = card.libraryMemberships.find((membership) =>
        membership.curatorId.equals(curatorId),
      );

      if (!libraryMembership?.publishedRecordId) {
        return err(
          new Error(
            "Card must be published in curator's library before adding to collection",
          ),
        );
      }

      // Get the original published record ID
      if (!card.originalPublishedRecordId) {
        return err(new Error('Card must have an original published record ID'));
      }

      // Find the card link in the collection
      const cardLink = collection.cardLinks.find((link) =>
        link.cardId.equals(card.cardId),
      );

      if (!cardLink) {
        return err(new Error('Card is not linked to this collection'));
      }

      const linkRecordDTO = CollectionLinkMapper.toCreateRecordDTO(
        cardLink,
        collection.publishedRecordId.getValue(),
        libraryMembership.publishedRecordId.getValue(),
        card.originalPublishedRecordId.getValue(),
      );

      const createResult = await agent.com.atproto.repo.createRecord({
        repo: curatorDid.value,
        collection: this.COLLECTION_LINK_COLLECTION,
        record: linkRecordDTO,
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

  /**
   * Unpublishes (deletes) a card-in-collection link
   */
  async unpublishCardAddedToCollection(
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
        return err(
          new Error(`Authentication error: ${agentResult.error.message}`),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      await agent.com.atproto.repo.deleteRecord({
        repo,
        collection: this.COLLECTION_LINK_COLLECTION,
        rkey,
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * Unpublishes (deletes) a Collection record and all its links
   */
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
        return err(
          new Error(`Authentication error: ${agentResult.error.message}`),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(new Error('No authenticated session found for curator'));
      }

      // Delete the collection record
      await agent.com.atproto.repo.deleteRecord({
        repo,
        collection: this.COLLECTION_COLLECTION,
        rkey,
      });

      // TODO: Also delete all collection link records that reference this collection
      // This would require querying for all links that reference this collection
      // and deleting them individually

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
