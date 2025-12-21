import { AtpAgent } from '@atproto/api';
import { CreateCollectionsOptions, BatchCreateResult } from '../types';

export class CollectionBatchManager {
  constructor(
    private agent: AtpAgent,
    private collectionCollection: string,
  ) {}

  async createCollections(
    options: CreateCollectionsOptions,
  ): Promise<BatchCreateResult> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    const writes = options.collections.map((collectionOptions) => ({
      $type: 'com.atproto.repo.applyWrites#create' as const,
      collection: this.collectionCollection,
      value: {
        $type: this.collectionCollection,
        name: collectionOptions.name,
        ...(collectionOptions.description && {
          description: collectionOptions.description,
        }),
        accessType: 'CLOSED',
        collaborators: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
}
