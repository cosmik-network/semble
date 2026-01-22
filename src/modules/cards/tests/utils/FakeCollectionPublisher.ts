import { ICollectionPublisher } from '../../application/ports/ICollectionPublisher';
import { Collection } from '../../domain/Collection';
import { Card } from '../../domain/Card';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { ok, err, Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { AppError } from '../../../../shared/core/AppError';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

export class FakeCollectionPublisher implements ICollectionPublisher {
  private publishedCollections: Map<string, Collection> = new Map();
  private publishedLinks: Map<
    string,
    { cardId: string; linkRecord: PublishedRecordId }[]
  > = new Map();
  private unpublishedCollections: Array<{ uri: string; cid: string }> = [];
  private removedLinks: Array<{ cardId: string; collectionId: string }> = [];
  private publishedRemovals: Map<
    string,
    {
      cardId: string;
      collectionId: string;
      removedLink: PublishedRecordId;
      removalRecord: PublishedRecordId;
    }[]
  > = new Map();
  private shouldFail: boolean = false;
  private shouldFailUnpublish: boolean = false;
  private collectionType =
    new EnvironmentConfigService().getAtProtoCollections().collection;

  private cardCollectionLinkType =
    new EnvironmentConfigService().getAtProtoCollections().collectionLink;

  private collectionLinkRemovalType =
    new EnvironmentConfigService().getAtProtoCollections()
      .collectionLinkRemoval;

  async publish(
    collection: Collection,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    if (this.shouldFail) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated collection publish failure'),
        ),
      );
    }

    const collectionId = collection.collectionId.getStringValue();

    // Use the collection's author DID directly
    const fakeDid = collection.authorId.value;

    // Simulate publishing the collection record itself
    const fakeCollectionUri = `at://${fakeDid}/${this.collectionType}/${collectionId}`;
    const fakeCollectionCid = `fake-collection-cid-${collectionId}`;

    const collectionRecord = PublishedRecordId.create({
      uri: fakeCollectionUri,
      cid: fakeCollectionCid,
    });

    // Store the published collection for inspection
    this.publishedCollections.set(collectionId, collection);

    console.log(
      `[FakeCollectionPublisher] Published collection ${collectionId}`,
    );

    return ok(collectionRecord);
  }

  async publishCardAddedToCollection(
    card: Card,
    collection: Collection,
    curatorId: CuratorId,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    if (this.shouldFail) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated card-collection link publish failure'),
        ),
      );
    }

    const collectionId = collection.collectionId.getStringValue();
    const cardId = card.cardId.getStringValue();

    // Simulate publishing a card-collection link
    const fakeLinkUri = `at://${curatorId.value}/${this.cardCollectionLinkType}/${collectionId}-${cardId}`;
    const fakeLinkCid = `fake-link-cid-${collectionId}-${cardId}`;

    const linkRecord = PublishedRecordId.create({
      uri: fakeLinkUri,
      cid: fakeLinkCid,
    });

    // Store published link for inspection
    const existingLinks = this.publishedLinks.get(collectionId) || [];
    existingLinks.push({
      cardId,
      linkRecord,
    });
    this.publishedLinks.set(collectionId, existingLinks);

    console.log(
      `[FakeCollectionPublisher] Published card ${cardId} added to collection ${collectionId} link at ${fakeLinkUri}`,
    );

    return ok(linkRecord);
  }

  async unpublishCardAddedToCollection(
    recordId: PublishedRecordId,
  ): Promise<Result<void, UseCaseError>> {
    if (this.shouldFailUnpublish) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated card-collection link unpublish failure'),
        ),
      );
    }

    // Find and remove the link by its published record ID
    for (const [collectionId, links] of this.publishedLinks.entries()) {
      const linkIndex = links.findIndex(
        (link) => link.linkRecord.uri === recordId.uri,
      );
      if (linkIndex !== -1) {
        const removedLink = links.splice(linkIndex, 1)[0];
        this.removedLinks.push({
          cardId: removedLink!.cardId,
          collectionId,
        });
        console.log(
          `[FakeCollectionPublisher] Unpublished card-collection link ${recordId.uri}`,
        );
        return ok(undefined);
      }
    }

    console.warn(
      `[FakeCollectionPublisher] Card-collection link not found for unpublishing: ${recordId.uri}`,
    );
    return ok(undefined);
  }

  async publishCollectionLinkRemoval(
    card: Card,
    collection: Collection,
    curatorId: CuratorId,
    removedLinkRef: PublishedRecordId,
    reason?: string,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    if (this.shouldFail) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated collection link removal publish failure'),
        ),
      );
    }

    const collectionId = collection.collectionId.getStringValue();
    const cardId = card.cardId.getStringValue();

    // Simulate publishing a collection link removal record
    const fakeRemovalUri = `at://${curatorId.value}/${this.collectionLinkRemovalType}/${collectionId}-${cardId}-removal`;
    const fakeRemovalCid = `fake-removal-cid-${collectionId}-${cardId}`;

    const removalRecord = PublishedRecordId.create({
      uri: fakeRemovalUri,
      cid: fakeRemovalCid,
    });

    // Store published removal for inspection
    const existingRemovals = this.publishedRemovals.get(collectionId) || [];
    existingRemovals.push({
      cardId,
      collectionId,
      removedLink: removedLinkRef,
      removalRecord,
    });
    this.publishedRemovals.set(collectionId, existingRemovals);

    console.log(
      `[FakeCollectionPublisher] Published removal of card ${cardId} from collection ${collectionId} at ${fakeRemovalUri}`,
    );

    return ok(removalRecord);
  }

  async unpublish(
    recordId: PublishedRecordId,
  ): Promise<Result<void, UseCaseError>> {
    if (this.shouldFailUnpublish) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated collection unpublish failure'),
        ),
      );
    }

    // Find and remove the collection by its published record ID
    for (const [
      collectionId,
      collection,
    ] of this.publishedCollections.entries()) {
      if (collection.publishedRecordId?.uri === recordId.uri) {
        this.publishedCollections.delete(collectionId);
        this.publishedLinks.delete(collectionId);
        this.unpublishedCollections.push({
          uri: recordId.uri,
          cid: recordId.cid,
        });
        console.log(
          `[FakeCollectionPublisher] Unpublished collection ${recordId.uri}`,
        );
        return ok(undefined);
      }
    }
    if (this.publishedCollections.size === 0) {
      this.unpublishedCollections.push({
        uri: recordId.uri,
        cid: recordId.cid,
      });
      console.log(
        `[FakeCollectionPublisher] Unpublished collection ${recordId.uri} (not found in published collections)`,
      );
      return ok(undefined);
    }

    console.warn(
      `[FakeCollectionPublisher] Collection not found for unpublishing: ${recordId.uri}`,
    );
    return ok(undefined);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setShouldFailUnpublish(shouldFailUnpublish: boolean): void {
    this.shouldFailUnpublish = shouldFailUnpublish;
  }

  clear(): void {
    this.publishedCollections.clear();
    this.publishedLinks.clear();
    this.unpublishedCollections = [];
    this.removedLinks = [];
    this.publishedRemovals.clear();
    this.shouldFail = false;
    this.shouldFailUnpublish = false;
  }

  getPublishedCollections(): Collection[] {
    return Array.from(this.publishedCollections.values());
  }

  getPublishedLinksForCollection(
    collectionId: string,
  ): Array<{ cardId: string; linkRecord: PublishedRecordId }> {
    return this.publishedLinks.get(collectionId) || [];
  }

  getUnpublishedCollections(): Array<{ uri: string; cid: string }> {
    return this.unpublishedCollections;
  }

  getRemovedLinksForCollection(
    collectionId: string,
  ): Array<{ cardId: string; collectionId: string }> {
    return this.removedLinks.filter(
      (link) => link.collectionId === collectionId,
    );
  }

  getAllRemovedLinks(): Array<{ cardId: string; collectionId: string }> {
    return this.removedLinks;
  }
  getAllPublishedLinks() {
    const allLinks: Array<{ cardId: string; linkRecord: PublishedRecordId }> =
      [];
    for (const links of this.publishedLinks.values()) {
      allLinks.push(...links);
    }
    return allLinks;
  }

  getPublishedRemovalsForCollection(collectionId: string) {
    return this.publishedRemovals.get(collectionId) || [];
  }

  getAllPublishedRemovals() {
    const allRemovals: Array<{
      cardId: string;
      collectionId: string;
      removedLink: PublishedRecordId;
      removalRecord: PublishedRecordId;
    }> = [];
    for (const removals of this.publishedRemovals.values()) {
      allRemovals.push(...removals);
    }
    return allRemovals;
  }
}
