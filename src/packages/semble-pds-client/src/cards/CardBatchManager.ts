import { AtpAgent } from '@atproto/api';
import { StrongRef, CreateCardsOptions, BatchCreateResult } from '../types';
import { MetadataFetcher } from '../metadata/MetadataFetcher';

export class CardBatchManager {
  private metadataFetcher: MetadataFetcher;

  constructor(
    private agent: AtpAgent,
    private baseNsid: string,
    private cardCollection: string,
  ) {
    this.metadataFetcher = new MetadataFetcher();
  }

  async createCards(options: CreateCardsOptions): Promise<BatchCreateResult> {
    if (!this.agent.session) {
      throw new Error('Not authenticated. Call login() first.');
    }

    // Fetch metadata for all URL cards in parallel
    const metadataPromises = options.cards.map(async (cardOptions) => {
      return await this.metadataFetcher.fetchUrlMetadata(cardOptions.url);
    });
    const metadataResults = await Promise.all(metadataPromises);

    // First batch: Create all URL cards
    const urlWrites = [];
    for (let i = 0; i < options.cards.length; i++) {
      const cardOptions = options.cards[i];
      const metadata = metadataResults[i];

      const record = {
        $type: this.cardCollection,
        type: 'URL',
        url: cardOptions.url,
        content: {
          $type: `${this.baseNsid}.card#urlContent`,
          url: cardOptions.url,
          ...(metadata && {
            metadata: {
              $type: `${this.baseNsid}.card#urlMetadata`,
              ...metadata,
            },
          }),
        },
        ...(cardOptions.viaCard && {
          provenance: {
            $type: `${this.baseNsid}.defs#provenance`,
            via: {
              uri: cardOptions.viaCard.uri,
              cid: cardOptions.viaCard.cid,
            },
          },
        }),
        createdAt: new Date().toISOString(),
      };

      urlWrites.push({
        $type: 'com.atproto.repo.applyWrites#create' as const,
        collection: this.cardCollection,
        value: record,
      });
    }

    // Execute first batch to create URL cards
    const urlResponse = await this.agent.com.atproto.repo.applyWrites({
      repo: this.agent.session.did,
      writes: urlWrites,
    });

    const urlResults =
      urlResponse.data.results?.map((result) => ({
        uri: (result as any).uri,
        cid: (result as any).cid,
      })) || [];

    // Second batch: Create NOTE cards that reference the URL cards
    const noteWrites = [];
    for (let i = 0; i < options.cards.length; i++) {
      const cardOptions = options.cards[i];

      if (cardOptions.note && urlResults[i]) {
        const noteRecord = {
          $type: this.cardCollection,
          type: 'NOTE',
          url: cardOptions.url,
          content: {
            $type: `${this.baseNsid}.card#noteContent`,
            text: cardOptions.note,
          },
          parentCard: {
            uri: urlResults[i].uri,
            cid: urlResults[i].cid,
          },
          createdAt: new Date().toISOString(),
        };

        noteWrites.push({
          $type: 'com.atproto.repo.applyWrites#create' as const,
          collection: this.cardCollection,
          value: noteRecord,
        });
      }
    }

    let noteResults: StrongRef[] = [];
    if (noteWrites.length > 0) {
      const noteResponse = await this.agent.com.atproto.repo.applyWrites({
        repo: this.agent.session.did,
        writes: noteWrites,
      });

      noteResults =
        noteResponse.data.results?.map((result) => ({
          uri: (result as any).uri,
          cid: (result as any).cid,
        })) || [];
    }

    // Combine all results
    return { results: [...urlResults, ...noteResults] };
  }
}
