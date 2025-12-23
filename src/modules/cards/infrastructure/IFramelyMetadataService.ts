import { IMetadataService } from '../domain/services/IMetadataService';
import { UrlMetadata } from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { Result, err } from '../../../shared/core/Result';
import { mapIFramelyUrlType } from './mappers/IFramelyUrlTypeMapper';

interface IFramelyMeta {
  title?: string;
  description?: string;
  author?: string;
  author_url?: string;
  site?: string;
  canonical?: string;
  duration?: number;
  date?: string;
  medium?: string;
}

interface IFramelyLinks {
  thumbnail?: Array<{
    href: string;
    media?: {
      height?: number;
      width?: number;
    };
  }>;
}

interface IFramelyResponse {
  id?: string;
  url?: string;
  meta?: IFramelyMeta;
  links?: IFramelyLinks;
  html?: string;
  error?: string;
}

export class IFramelyMetadataService implements IMetadataService {
  private readonly baseUrl = 'https://iframe.ly/api/iframely';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Iframely API key is required');
    }
    this.apiKey = apiKey;
  }

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    try {
      const encodedUrl = encodeURIComponent(url.value);
      const fullUrl = `${this.baseUrl}?url=${encodedUrl}&api_key=${this.apiKey}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        return err(
          new Error(
            `Iframely API request failed with status ${response.status} and message: ${response.statusText}`,
          ),
        );
      }

      const data = (await response.json()) as IFramelyResponse;

      // Check if the response contains an error
      if (data.error) {
        return err(new Error(`Iframely service error: ${data.error}`));
      }

      // Check if we have meta data
      if (!data.meta) {
        return err(new Error('No metadata found for the given URL'));
      }

      const meta = data.meta;

      // Parse published date
      const publishedDate = meta.date ? this.parseDate(meta.date) : undefined;

      // Extract image URL from thumbnail links
      const imageUrl = this.extractImageUrl(data.links);

      const metadataResult = UrlMetadata.create({
        url: url.value,
        title: meta.title,
        description: meta.description,
        author: meta.author,
        publishedDate,
        siteName: meta.site,
        imageUrl,
        type: mapIFramelyUrlType(meta.medium),
      });

      return metadataResult;
    } catch (error) {
      return err(
        new Error(
          `Failed to fetch metadata from Iframely: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a simple URL to check if the service is available
      const testUrl = `${this.baseUrl}?url=${encodeURIComponent('https://example.com')}&api_key=${this.apiKey}`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
      });

      // Service is available if we get any response (even 4xx errors are fine)
      return response.status < 500;
    } catch {
      return false;
    }
  }

  private parseDate(dateString: string): Date | undefined {
    try {
      // Try to parse the date string
      const parsed = new Date(dateString);

      // Check if the date is valid
      if (isNaN(parsed.getTime())) {
        return undefined;
      }

      return parsed;
    } catch {
      return undefined;
    }
  }

  private extractImageUrl(links?: IFramelyLinks): string | undefined {
    if (!links || !links.thumbnail || links.thumbnail.length === 0) {
      return undefined;
    }

    // Return the first thumbnail URL
    return links.thumbnail[0]?.href;
  }
}
