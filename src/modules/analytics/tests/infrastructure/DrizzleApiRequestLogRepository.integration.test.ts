import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleApiRequestLogRepository } from '../../infrastructure/repositories/DrizzleApiRequestLogRepository';
import { apiRequestLogs } from '../../infrastructure/repositories/schema/apiRequestLog.sql';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';

describe('DrizzleApiRequestLogRepository', () => {
  let container: StartedPostgreSqlContainer;
  let client: postgres.Sql;
  let db: PostgresJsDatabase;
  let repository: DrizzleApiRequestLogRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    client = postgres(container.getConnectionUri());
    db = drizzle(client);
    await createTestSchema(db);
    repository = new DrizzleApiRequestLogRepository(db);
  }, 60000);

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  it('persists a request log entry', async () => {
    const result = await repository.log({
      userDid: 'did:plc:testuser',
      method: 'GET',
      endpoint: '/xrpc/cards/:id',
      source: 'mcp',
      authMethod: 'apiKey',
      status: 200,
    });

    expect(result.isOk()).toBe(true);

    const rows = await db.select().from(apiRequestLogs);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userDid: 'did:plc:testuser',
      method: 'GET',
      endpoint: '/xrpc/cards/:id',
      source: 'mcp',
      authMethod: 'apiKey',
      status: 200,
    });
    expect(rows[0]!.id).toBeTruthy();
    expect(rows[0]!.createdAt).toBeInstanceOf(Date);
  });
});
