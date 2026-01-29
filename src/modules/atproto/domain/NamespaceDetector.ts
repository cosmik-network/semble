import { ATPROTO_NSID } from 'src/shared/constants/atproto';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { StrongRef } from './StrongRef';

export enum RecordNamespace {
  COSMIK = 'cosmik',
  MARGIN = 'margin',
  UNKNOWN = 'unknown',
}

/**
 * Utility for detecting the namespace (Margin vs Cosmik) of AT Protocol records.
 * This is useful for determining which collection to use when operating on records
 * that may come from different sources.
 */
export class NamespaceDetector {
  /**
   * Detects the namespace from a collection name.
   * @param collection - The collection name (e.g., "at.margin.bookmark" or "network.cosmik.card")
   * @returns The detected namespace
   */
  static detectFromCollection(collection: string): RecordNamespace {
    if (collection.startsWith(ATPROTO_NSID.MARGIN.NAMESPACE)) {
      return RecordNamespace.MARGIN;
    }
    if (collection.startsWith(ATPROTO_NSID.COSMIK.NAMESPACE)) {
      return RecordNamespace.COSMIK;
    }
    return RecordNamespace.UNKNOWN;
  }

  /**
   * Detects the namespace from an AT URI string.
   * @param uri - The AT URI (e.g., "at://did:plc:abc.../at.margin.bookmark/xyz")
   * @returns The detected namespace
   */
  static detectFromUri(uri: string): RecordNamespace {
    // Parse AT URI: at://{did}/{collection}/{rkey}
    const parts = uri.split('/');
    if (parts.length >= 4) {
      const collection = parts[3];
      if (collection) {
        return this.detectFromCollection(collection);
      }
    }
    return RecordNamespace.UNKNOWN;
  }

  /**
   * Detects the namespace from a PublishedRecordId.
   * @param recordId - The published record ID
   * @returns The detected namespace
   */
  static detectFromPublishedRecordId(
    recordId: PublishedRecordId,
  ): RecordNamespace {
    return this.detectFromUri(recordId.uri);
  }

  /**
   * Extracts the collection name from a PublishedRecordId.
   * This is useful for operations that need the actual collection name.
   * @param recordId - The published record ID
   * @returns The collection name or undefined if not found
   */
  static extractCollectionFromPublishedRecordId(
    recordId: PublishedRecordId,
  ): string | undefined {
    try {
      const strongRef = new StrongRef(recordId.getValue());
      return strongRef.atUri.collection;
    } catch (error) {
      return undefined;
    }
  }
}
