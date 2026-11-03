import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { isStatementTimeoutError } from '../isStatementTimeoutError';

describe('isStatementTimeoutError', () => {
  let container: StartedPostgreSqlContainer;
  let client: postgres.Sql;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    // Same mechanism as DatabaseFactory.createStatsConnection: the timeout is
    // sent as a startup parameter on a direct (non-PgBouncer) connection
    client = postgres(container.getConnectionUri(), {
      connection: { statement_timeout: 100 },
    });
  }, 60000);

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  it('applies the startup statement_timeout and detects the resulting error', async () => {
    const db = drizzle(client);

    const rows = (await db.execute(
      sql`SHOW statement_timeout`,
    )) as unknown as Array<{ statement_timeout: string }>;
    expect(rows[0]?.statement_timeout).toBe('100ms');

    const error = await db.execute(sql`SELECT pg_sleep(1)`).catch((e) => e);
    expect(isStatementTimeoutError(error)).toBe(true);
    // Still detected after a use case wraps it
    expect(
      isStatementTimeoutError(new Error('wrapped', { cause: error })),
    ).toBe(true);
  });

  it('ignores other errors', async () => {
    const error = await drizzle(client)
      .execute(sql`SELECT * FROM missing_table`)
      .catch((e) => e);
    expect(isStatementTimeoutError(error)).toBe(false);
    expect(isStatementTimeoutError(undefined)).toBe(false);
  });
});
