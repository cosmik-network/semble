import { AtpAgent } from '@atproto/api';
import { createAgentForDID } from '../utils/didResolver';
import {
  StrongRef,
  CreateCollectionOptions,
  CollectionRecord,
  ListQueryParams,
  GetCollectionsResult,
} from '../types';

export class CollectionManager {
  constructor(
    private agent: AtpAgent,
    private collectionCollection: string,
  ) {}

  async create(options: CreateCollectionOptions): Promise<StrongRef> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const record = {
      $type: this.collectionCollection,
      name: options.name,
      ...(options.description && { description: options.description }),
      accessType: 'CLOSED',
      collaborators: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session.did,
      collection: this.collectionCollection,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  async update(
    collectionRef: StrongRef,
    name: string,
    description?: string,
  ): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionRef.uri);

    const record = {
      $type: this.collectionCollection,
      name,
      ...(description && { description }),
      accessType: 'CLOSED',
      collaborators: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.agent.com.atproto.repo.putRecord({
      repo: this.agent.session.did,
      collection: this.collectionCollection,
      rkey,
      record,
    });
  }

  async delete(collectionRef: StrongRef): Promise<void> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionRef.uri);

    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session.did,
      collection: this.collectionCollection,
      rkey,
    });
  }

  async get(collectionRef: StrongRef): Promise<CollectionRecord> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const rkey = this.extractRkey(collectionRef.uri);

    const response = await this.agent.com.atproto.repo.getRecord({
      repo: this.agent.session.did,
      collection: this.collectionCollection,
      rkey,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid || '',
      value: response.data.value as CollectionRecord['value'],
    };
  }

  async getMy(params?: ListQueryParams): Promise<GetCollectionsResult> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const response = await this.agent.com.atproto.repo.listRecords({
      repo: this.agent.session.did,
      collection: this.collectionCollection,
      limit: params?.limit,
      cursor: params?.cursor,
      reverse: params?.reverse,
    });

    return {
      cursor: response.data.cursor,
      records: response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        value: record.value as CollectionRecord['value'],
      })),
    };
  }

  async getForUser(
    did: string,
    params?: ListQueryParams,
  ): Promise<GetCollectionsResult> {
    try {
      const userAgent = await createAgentForDID(did);
      const response = await userAgent.com.atproto.repo.listRecords({
        repo: did,
        collection: this.collectionCollection,
        limit: params?.limit,
        cursor: params?.cursor,
        reverse: params?.reverse,
      });
      return {
        cursor: response.data.cursor,
        records: response.data.records.map((record) => ({
          uri: record.uri,
          cid: record.cid,
          value: record.value as CollectionRecord['value'],
        })),
      };
    } catch (error) {
      console.error('Error fetching collections for user:', error);
      throw error;
    }
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
