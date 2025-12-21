import urlMetadata from 'url-metadata';
import { UrlMetadata } from '../types';

export class MetadataFetcher {
  async fetchUrlMetadata(url: string): Promise<UrlMetadata | undefined> {
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
}
