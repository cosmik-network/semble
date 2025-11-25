import { AtpAgent } from '@atproto/api';
import urlMetadata from 'url-metadata';
import {
  StrongRef,
  UrlMetadata,
  CreateCardOptions,
  CreateCollectionOptions,
  SemblePDSClientOptions,
} from './types';

export class SemblePDSClient {
  private agent: AtpAgent;
  private readonly CARD_COLLECTION = 'network.cosmik.card';
  private readonly COLLECTION_COLLECTION = 'network.cosmik.collection';
  private readonly COLLECTION_LINK_COLLECTION = 'network.cosmik.collectionLink';

  constructor(options: SemblePDSClientOptions) {
    this.agent = new AtpAgent({
      service: options.service,
    });
  }

  async login(identifier: string, password: string): Promise<void> {
    await this.agent.login({
      identifier,
      password,
    });
  }

  private async fetchUrlMetadata(
    url: string,
  ): Promise<UrlMetadata | undefined> {
    try {
      const metadata = await urlMetadata(url);
      return {
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        siteName: metadata['site_name'] || metadata.siteName,
        imageUrl: metadata.image || metadata['og:image'],
        type: metadata.type || 'link',
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Failed to fetch URL metadata:', error);
      return undefined;
    }
  }

  async createCard(options: CreateCardOptions): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const metadata = await this.fetchUrlMetadata(options.url);

    const record = {
      $type: this.CARD_COLLECTION,
      type: 'URL',
      url: options.url,
      content: {
        $type: 'network.cosmik.card#urlContent',
        url: options.url,
        ...(metadata && {
          metadata: { $type: 'network.cosmik.card#urlMetadata', ...metadata },
        }),
      },
      createdAt: new Date().toISOString(),
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.CARD_COLLECTION,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  async addNoteToCard(
    parentCard: StrongRef,
    noteText: string,
  ): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const record = {
      $type: this.CARD_COLLECTION,
      type: 'NOTE',
      content: {
        $type: 'network.cosmik.card#noteContent',
        text: noteText,
      },
      parentCard: {
        uri: parentCard.uri,
        cid: parentCard.cid,
      },
      createdAt: new Date().toISOString(),
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.CARD_COLLECTION,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  async createCollection(options: CreateCollectionOptions): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const record = {
      $type: this.COLLECTION_COLLECTION,
      name: options.name,
      ...(options.description && { description: options.description }),
      accessType: 'CLOSED',
      collaborators: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.COLLECTION_COLLECTION,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  async addCardToCollection(
    card: StrongRef,
    collection: StrongRef,
  ): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const record = {
      $type: this.COLLECTION_LINK_COLLECTION,
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
      createdAt: new Date().toISOString(),
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.COLLECTION_LINK_COLLECTION,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  async updateNote(noteRef: StrongRef, updatedText: string): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(noteRef.uri);

    const record = {
      $type: this.CARD_COLLECTION,
      type: 'NOTE',
      content: {
        $type: 'network.cosmik.card#noteContent',
        text: updatedText,
      },
      createdAt: new Date().toISOString(),
    };

    await this.agent.com.atproto.repo.putRecord({
      repo: this.agent.session.did,
      collection: this.CARD_COLLECTION,
      rkey,
      record,
    });
  }

  async deleteCard(cardRef: StrongRef): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(cardRef.uri);

    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session.did,
      collection: this.CARD_COLLECTION,
      rkey,
    });
  }

  async updateCollection(
    collectionRef: StrongRef,
    name: string,
    description?: string,
  ): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionRef.uri);

    const record = {
      $type: this.COLLECTION_COLLECTION,
      name,
      ...(description && { description }),
      accessType: 'CLOSED',
      collaborators: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.agent.com.atproto.repo.putRecord({
      repo: this.agent.session.did,
      collection: this.COLLECTION_COLLECTION,
      rkey,
      record,
    });
  }

  async deleteCollection(collectionRef: StrongRef): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionRef.uri);

    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session.did,
      collection: this.COLLECTION_COLLECTION,
      rkey,
    });
  }

  async removeCardFromCollection(collectionLinkRef: StrongRef): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionLinkRef.uri);

    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session.did,
      collection: this.COLLECTION_LINK_COLLECTION,
      rkey,
    });
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

export * from './types';
