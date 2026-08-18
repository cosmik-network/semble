import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  ApiRequestLogEntry,
  IApiRequestLogRepository,
} from '../../domain/IApiRequestLogRepository';
import { apiRequestLogs } from './schema/apiRequestLog.sql';
import { Result, ok, err } from '../../../../shared/core/Result';

export class DrizzleApiRequestLogRepository implements IApiRequestLogRepository {
  constructor(private db: PostgresJsDatabase) {}

  async log(entry: ApiRequestLogEntry): Promise<Result<void>> {
    try {
      await this.db.insert(apiRequestLogs).values({
        userDid: entry.userDid,
        method: entry.method,
        endpoint: entry.endpoint,
        source: entry.source,
        authMethod: entry.authMethod,
        status: entry.status,
      });
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
