import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';
import {
  IAtProtoRepoService,
  AtProtoRecord,
  AtProtoRecordPage,
} from '../../application/IAtProtoRepoService';
import { DID } from '../../domain/DID';

/**
 * Real implementation of IAtProtoRepoService using AT Protocol API
 */
export class ATProtoRepoService implements IAtProtoRepoService {
  constructor(private readonly agentService: IAgentService) {}

  async listRecords(
    repo: string,
    collection: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<Result<AtProtoRecordPage, Error>> {
    try {
      // Get unauthenticated agent
      const didResult = DID.create(repo);
      if (didResult.isErr()) {
        return err(new Error(`Invalid DID for repo: ${repo}`));
      }
      const did = didResult.value;

      const agentResult =
        await this.agentService.getUnauthenticatedAgentForDid(did);
      if (agentResult.isErr()) {
        return err(
          new Error(`Failed to get agent: ${agentResult.error.message}`),
        );
      }

      const agent = agentResult.value;

      // Fetch records from AT Protocol repository
      console.log(
        `Fetching records from repo: ${repo}, collection: ${collection}, cursor: ${options?.cursor}, limit: ${options?.limit}`,
      );
      const response = await agent.com.atproto.repo.listRecords({
        repo,
        collection,
        limit: options?.limit ?? 100,
        cursor: options?.cursor,
      });

      // Transform response to our domain types
      const records: AtProtoRecord[] = response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        value: record.value,
      }));

      return ok({
        records,
        cursor: response.data.cursor,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to fetch records from ${collection}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async *listAllRecords(
    repo: string,
    collection: string,
    batchSize: number = 100,
  ): AsyncGenerator<Result<AtProtoRecord[], Error>> {
    let cursor: string | undefined;

    do {
      // Fetch a page of records
      const pageResult = await this.listRecords(repo, collection, {
        cursor,
        limit: batchSize,
      });

      // If there's an error, yield it and stop
      if (pageResult.isErr()) {
        yield err(pageResult.error);
        return;
      }

      const page = pageResult.value;

      // Yield the records from this page
      if (page.records.length > 0) {
        yield ok(page.records);
      }

      // Update cursor for next iteration
      cursor = page.cursor;
    } while (cursor);
  }
}
