import { Result, ok, err } from '../../../../shared/core/Result';
import { AppError } from '../../../../shared/core/AppError';
import { IMetadataService } from '../../../cards/domain/services/IMetadataService';
import { UrlMetadata } from '../../../cards/domain/value-objects/UrlMetadata';
import { URL } from '../../../cards/domain/value-objects/URL';
import {
  ILeafletSearchService,
  LeafletDocumentResult,
} from './ILeafletSearchService';
const atpi = require('atpi');

export interface LeafletLinkingRecord {
  did: string;
  collection: string;
  rkey: string;
}

export interface LeafletLinksResponse {
  total: number;
  linking_records: LeafletLinkingRecord[];
  cursor: string | null;
}

export interface LeafletDocumentRecord {
  $type: string;
  title: string;
  author: string;
  description?: string;
  publication: string;
  publishedAt: string;
  pages: any[];
}

export interface LeafletPublicationRecord {
  $type: string;
  name: string;
  base_path: string;
  description?: string;
  preferences?: any;
}

export class ConstellationLeafletSearchService
  implements ILeafletSearchService
{
  private readonly CONSTELLATION_BASE_URL =
    'https://constellation.microcosm.blue';

  constructor(private metadataService: IMetadataService) {}

  async searchLeafletDocsForUrl(
    targetUrl: string,
    limit?: number,
    cursor?: string,
  ): Promise<Result<LeafletDocumentResult[], AppError.UnexpectedError>> {
    try {
      // Step 1: Get backlinks from Constellation
      const backlinksResult = await this.getBacklinksFromConstellation(
        targetUrl,
        limit,
        cursor,
      );
      if (backlinksResult.isErr()) {
        return err(backlinksResult.error);
      }

      const backlinks = backlinksResult.value;
      const results: LeafletDocumentResult[] = [];

      // Step 2: Process all linking records in parallel
      const documentPromises = backlinks.linking_records.map(async (record) => {
        try {
          const documentResult = await this.processLeafletDocument(record);
          return documentResult.isOk() ? documentResult.value : null;
        } catch (error) {
          // Continue processing other records if one fails
          console.warn(
            `Failed to process leaflet document ${record.did}/${record.rkey}:`,
            error,
          );
          return null;
        }
      });

      const documentResults = await Promise.all(documentPromises);

      // Filter out null results
      for (const result of documentResults) {
        if (result !== null) {
          results.push(result);
        }
      }

      return ok(results);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }

  private async getBacklinksFromConstellation(
    targetUrl: string,
    limit?: number,
    cursor?: string,
  ): Promise<Result<LeafletLinksResponse, AppError.UnexpectedError>> {
    try {
      const params = new URLSearchParams({
        target: targetUrl,
        collection: 'pub.leaflet.document',
        path: '.pages[pub.leaflet.pages.linearDocument].blocks[pub.leaflet.pages.linearDocument#block].block.facets[].features[pub.leaflet.richtext.facet#link].uri',
      });

      if (limit) params.set('limit', limit.toString());
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(
        `${this.CONSTELLATION_BASE_URL}/links?${params}`,
        {
          headers: {
            'User-Agent': 'Semble (@semble.so)',
          },
        },
      );

      if (!response.ok) {
        return err(
          new AppError.UnexpectedError(
            new Error(`Constellation API error: ${response.statusText}`),
          ),
        );
      }

      const data: LeafletLinksResponse = await response.json();
      return ok(data);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }

  private async processLeafletDocument(
    record: LeafletLinkingRecord,
  ): Promise<Result<LeafletDocumentResult, AppError.UnexpectedError>> {
    try {
      // Step 1: Get the document record
      const documentResult = await this.getLeafletDocumentRecord(
        record.did,
        record.rkey,
      );
      if (documentResult.isErr()) {
        return err(documentResult.error);
      }

      const document = documentResult.value;

      // Step 2: Get the publication record
      const publicationAtUri = document.publication;
      const publicationResult =
        await this.getLeafletPublicationFromAtUri(publicationAtUri);
      if (publicationResult.isErr()) {
        return err(publicationResult.error);
      }

      const publication = publicationResult.value;

      // Step 3: Construct the URL
      const documentUrl = `https://${publication.base_path}/${record.rkey}`;

      // Step 4: Fetch metadata
      const urlResult = URL.create(documentUrl);
      if (urlResult.isErr()) {
        return err(new AppError.UnexpectedError(urlResult.error));
      }

      const metadataResult = await this.metadataService.fetchMetadata(
        urlResult.value,
      );
      if (metadataResult.isErr()) {
        // If metadata fetch fails, create basic metadata from document
        const basicMetadata = UrlMetadata.create({
          url: documentUrl,
          title: document.title,
          description: document.description,
          author: document.author,
          publishedDate: new Date(document.publishedAt),
          siteName: publication.name,
        });

        if (basicMetadata.isErr()) {
          return err(new AppError.UnexpectedError(basicMetadata.error));
        }

        return ok({
          url: documentUrl,
          metadata: basicMetadata.value,
        });
      }

      return ok({
        url: documentUrl,
        metadata: metadataResult.value,
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }

  private async getLeafletDocumentRecord(
    did: string,
    rkey: string,
  ): Promise<Result<LeafletDocumentRecord, AppError.UnexpectedError>> {
    try {
      const atUri = `at://${did}/pub.leaflet.document/${rkey}`;
      const data = await atpi.resolve(atUri);
      return ok(data.value as LeafletDocumentRecord);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }

  private async getLeafletPublicationFromAtUri(
    atUri: string,
  ): Promise<Result<LeafletPublicationRecord, AppError.UnexpectedError>> {
    try {
      const data = await atpi.resolve(atUri);
      return ok(data.value as LeafletPublicationRecord);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
