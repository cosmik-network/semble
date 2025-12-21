import { AtpAgent } from '@atproto/api';
import {
  StrongRef,
  CreateCardOptions,
  CreateCardResult,
  CardRecord,
  ListQueryParams,
  GetCardsResult,
} from '../types';
import { MetadataFetcher } from '../metadata/MetadataFetcher';

export class CardManager {
  private metadataFetcher: MetadataFetcher;

  constructor(
    private agent: AtpAgent,
    private baseNsid: string,
    private cardCollection: string,
  ) {
    this.metadataFetcher = new MetadataFetcher();
  }

  async create(options: CreateCardOptions): Promise<CreateCardResult> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const metadata = await this.metadataFetcher.fetchUrlMetadata(options.url);

    const record = {
      $type: this.cardCollection,
      type: 'URL',
      url: options.url,
      content: {
        $type: `${this.baseNsid}.card#urlContent`,
        url: options.url,
        ...(metadata && {
          metadata: {
            $type: `${this.baseNsid}.card#urlMetadata`,
            ...metadata,
          },
        }),
      },
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
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.cardCollection,
      record,
    });

    const urlCard = {
      uri: response.data.uri,
      cid: response.data.cid,
    };

    // If a note is provided, create a NOTE card that references the URL card as parent
    if (options.note) {
      const noteRecord = {
        $type: this.cardCollection,
        type: 'NOTE',
        url: options.url,
        content: {
          $type: `${this.baseNsid}.card#noteContent`,
          text: options.note,
        },
        parentCard: {
          uri: urlCard.uri,
          cid: urlCard.cid,
        },
        createdAt: new Date().toISOString(),
      };

      const noteResponse = await this.agent.com.atproto.repo.createRecord({
        repo: this.agent.session.did,
        collection: this.cardCollection,
        record: noteRecord,
      });

      const noteCard = {
        uri: noteResponse.data.uri,
        cid: noteResponse.data.cid,
      };

      return {
        urlCard,
        noteCard,
      };
    }

    return {
      urlCard,
    };
  }

  async addNote(parentCard: StrongRef, noteText: string): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const record = {
      $type: this.cardCollection,
      type: 'NOTE',
      content: {
        $type: `${this.baseNsid}.card#noteContent`,
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
      collection: this.cardCollection,
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
      $type: this.cardCollection,
      type: 'NOTE',
      content: {
        $type: `${this.baseNsid}.card#noteContent`,
        text: updatedText,
      },
      createdAt: new Date().toISOString(),
    };

    await this.agent.com.atproto.repo.putRecord({
      repo: this.agent.session.did,
      collection: this.cardCollection,
      rkey,
      record,
    });
  }

  async delete(cardRef: StrongRef): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(cardRef.uri);

    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session.did,
      collection: this.cardCollection,
      rkey,
    });
  }

  async get(cardRef: StrongRef): Promise<CardRecord> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(cardRef.uri);

    const response = await this.agent.com.atproto.repo.getRecord({
      repo: this.agent.session.did,
      collection: this.cardCollection,
      rkey,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid || '',
      value: response.data.value as CardRecord['value'],
    };
  }

  async getMy(params?: ListQueryParams): Promise<GetCardsResult> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const response = await this.agent.com.atproto.repo.listRecords({
      repo: this.agent.session.did,
      collection: this.cardCollection,
      limit: params?.limit,
      cursor: params?.cursor,
      reverse: params?.reverse,
    });

    return {
      cursor: response.data.cursor,
      records: response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        value: record.value as CardRecord['value'],
      })),
    };
  }

  async getForUser(
    did: string,
    params?: ListQueryParams,
  ): Promise<GetCardsResult> {
    const response = await this.agent.com.atproto.repo.listRecords({
      repo: did,
      collection: this.cardCollection,
      limit: params?.limit,
      cursor: params?.cursor,
      reverse: params?.reverse,
    });

    return {
      cursor: response.data.cursor,
      records: response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        value: record.value as CardRecord['value'],
      })),
    };
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
