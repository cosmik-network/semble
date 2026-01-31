import { Result } from '../../../shared/core/Result';

/**
 * Represents a record from an AT Protocol repository
 */
export interface AtProtoRecord {
  uri: string;
  cid: string;
  value: any;
}

/**
 * Represents a page of records from an AT Protocol repository
 */
export interface AtProtoRecordPage {
  records: AtProtoRecord[];
  cursor?: string;
}

/**
 * Service for fetching records from AT Protocol repositories
 * Abstracts the AT Protocol repository API for fetching user data
 */
export interface IAtProtoRepoService {
  /**
   * Fetch a single page of records from a user's repository
   * Supports manual pagination control via cursor
   *
   * @param repo - The repository DID or handle
   * @param collection - The NSID of the collection (e.g., 'at.margin.bookmark')
   * @param options - Optional pagination parameters
   * @returns Result containing a page of records with optional cursor for next page
   */
  listRecords(
    repo: string,
    collection: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<Result<AtProtoRecordPage, Error>>;

  /**
   * Fetch all records from a repository collection with automatic pagination
   * Yields batches of records as they are fetched
   *
   * @param repo - The repository DID or handle
   * @param collection - The NSID of the collection
   * @param batchSize - Number of records to fetch per page (default: 100)
   * @returns AsyncGenerator that yields batches of records
   */
  listAllRecords(
    repo: string,
    collection: string,
    batchSize?: number,
  ): AsyncGenerator<Result<AtProtoRecord[], Error>>;
}
