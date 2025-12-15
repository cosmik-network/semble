import { AtpAgent } from '@atproto/api';
import { StrongRef, AddCardsToCollectionOptions, BatchCreateResult } from '../types';

export class CollectionLinkManager {
  constructor(
    private agent: AtpAgent,
    private baseNsid: string,
    private collectionLinkCollection: string,
  ) {}

  async addCardToCollection(
    card: StrongRef,
    collection: StrongRef,
    viaCard?: StrongRef,
  ): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const record = {
      $type: this.collectionLinkCollection,
      card: {
        uri: card.uri,
        cid: card.cid,
      },
      collection: {
        uri: collection.uri,
        cid: collection.cid,
      },
      addedBy: this.agent.session.did,
      addedAt: new Date().toISOString(),
      ...(viaCard && {
        provenance: {
          $type: `${this.baseNsid}.defs#provenance`,
          via: {
            uri: viaCard.uri,
            cid: viaCard.cid,
          },
        },
      }),
      createdAt: new Date().toISOString(),
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.collectionLinkCollection,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  async removeCardFromCollection(collectionLinkRef: StrongRef): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionLinkRef.uri);

    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session.did,
      collection: this.collectionLinkCollection,
      rkey,
    });
  }

  async addCardsToCollection(options: AddCardsToCollectionOptions): Promise<BatchCreateResult> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const writes = options.cards.map((card) => ({
      $type: 'com.atproto.repo.applyWrites#create' as const,
      collection: this.collectionLinkCollection,
      value: {
        $type: this.collectionLinkCollection,
        card: {
          uri: card.uri,
          cid: card.cid,
        },
        collection: {
          uri: options.collection.uri,
          cid: options.collection.cid,
        },
        addedBy: this.agent.session?.did,
        addedAt: new Date().toISOString(),
        ...(options.viaCard && {
          provenance: {
            $type: `${this.baseNsid}.defs#provenance`,
            via: {
              uri: options.viaCard.uri,
              cid: options.viaCard.cid,
            },
          },
        }),
        createdAt: new Date().toISOString(),
      },
    }));

    const response = await this.agent.com.atproto.repo.applyWrites({
      repo: this.agent.session.did,
      writes,
    });

    const results =
      response.data.results?.map((result) => ({
        uri: (result as any).uri,
        cid: (result as any).cid,
      })) || [];

    return { results };
  }

  private extractRkey(uri: string): string {
    const parts = uri.split('/');
    const rkey = parts[parts.length - 1];
    if (!rkey) {
      throw new Error(`Invalid URI format: ${uri}`);
    }
    return rkey;
  }
}
