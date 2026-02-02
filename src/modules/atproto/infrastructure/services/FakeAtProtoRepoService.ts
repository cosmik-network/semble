import { Result, ok, err } from 'src/shared/core/Result';
import {
  IAtProtoRepoService,
  AtProtoRecord,
  AtProtoRecordPage,
} from '../../application/IAtProtoRepoService';

/**
 * Fake implementation of IAtProtoRepoService for testing
 * Stores records in memory and allows configurable behavior
 */
export class FakeAtProtoRepoService implements IAtProtoRepoService {
  private records = new Map<string, AtProtoRecord[]>();
  private shouldFail = false;
  private failureMessage = 'Simulated failure';

  /**
   * Set records for a specific repository and collection
   * @param repo - The repository identifier
   * @param collection - The collection NSID
   * @param records - The records to store
   */
  setRecords(repo: string, collection: string, records: AtProtoRecord[]): void {
    const key = this.makeKey(repo, collection);
    this.records.set(key, records);
  }

  /**
   * Get records for a specific repository and collection
   * @param repo - The repository identifier
   * @param collection - The collection NSID
   * @returns The stored records or empty array if none exist
   */
  getRecords(repo: string, collection: string): AtProtoRecord[] {
    const key = this.makeKey(repo, collection);
    return this.records.get(key) || [];
  }

  /**
   * Configure the service to fail on next operation
   * @param shouldFail - Whether operations should fail
   * @param message - Optional custom error message
   */
  setShouldFail(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  /**
   * Clear all stored records
   */
  clear(): void {
    this.records.clear();
    this.shouldFail = false;
    this.failureMessage = 'Simulated failure';
  }

  async listRecords(
    repo: string,
    collection: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<Result<AtProtoRecordPage, Error>> {
    if (this.shouldFail) {
      return err(new Error(this.failureMessage));
    }

    const key = this.makeKey(repo, collection);
    const allRecords = this.records.get(key) || [];
    const limit = options?.limit ?? 100;

    // Parse cursor (it's just an offset in our fake implementation)
    const offset = options?.cursor ? parseInt(options.cursor, 10) : 0;

    // Slice records based on offset and limit
    const records = allRecords.slice(offset, offset + limit);

    // Calculate next cursor if there are more records
    const nextOffset = offset + limit;
    const cursor =
      nextOffset < allRecords.length ? String(nextOffset) : undefined;

    return ok({
      records,
      cursor,
    });
  }

  async *listAllRecords(
    repo: string,
    collection: string,
    batchSize: number = 100,
  ): AsyncGenerator<Result<AtProtoRecord[], Error>> {
    if (this.shouldFail) {
      yield err(new Error(this.failureMessage));
      return;
    }

    let cursor: string | undefined;

    do {
      const pageResult = await this.listRecords(repo, collection, {
        cursor,
        limit: batchSize,
      });

      if (pageResult.isErr()) {
        yield err(pageResult.error);
        return;
      }

      const page = pageResult.value;

      if (page.records.length > 0) {
        yield ok(page.records);
      }

      cursor = page.cursor;
    } while (cursor);
  }

  private makeKey(repo: string, collection: string): string {
    return `${repo}:${collection}`;
  }
}
