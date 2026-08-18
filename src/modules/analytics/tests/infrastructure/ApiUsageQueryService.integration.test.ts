import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';
import { apiRequestLogs } from '../../infrastructure/repositories/schema/apiRequestLog.sql';
import { ApiUsageQueryService } from '../../infrastructure/repositories/query-services/ApiUsageQueryService';
import { EXCLUDED_ANALYTICS_USER_IDS } from '../../infrastructure/repositories/query-services/excludedUsers';

const USER_1 = 'did:plc:apiuser1';
const USER_2 = 'did:plc:apiuser2';
const USER_3 = 'did:plc:apiuser3';

// Weeks under test (ISO Mondays, UTC):
//   empty week: 2026-07-27
//   week A:     2026-08-03
//   week B:     2026-08-10 (end week)
const WEEK_A = '2026-08-03T00:00:00.000Z';
const WEEK_B = '2026-08-10T00:00:00.000Z';
const EMPTY_WEEK = '2026-07-27T00:00:00.000Z';
const END_WEEK = '2026-08-10';

function entry(
  userDid: string,
  source: string,
  createdAt: string,
  overrides: Partial<typeof apiRequestLogs.$inferInsert> = {},
) {
  return {
    userDid,
    method: 'GET',
    endpoint: '/xrpc/cards/:id',
    source,
    authMethod: 'apiKey',
    status: 200,
    createdAt: new Date(createdAt),
    ...overrides,
  };
}

describe('DrizzleApiUsageQueryService', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let service: ApiUsageQueryService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const client = postgres(container.getConnectionUri());
    db = drizzle(client);
    await createTestSchema(db);
    service = new ApiUsageQueryService(db);

    await db.insert(apiRequestLogs).values([
      // Week A: user1 makes 3 mcp calls, user2 makes 1 api call
      entry(USER_1, 'mcp', '2026-08-03T10:00:00Z'),
      entry(USER_1, 'mcp', '2026-08-04T10:00:00Z'),
      entry(USER_1, 'mcp', '2026-08-05T10:00:00Z', {
        method: 'POST',
        endpoint: '/xrpc/cards',
      }),
      entry(USER_2, 'api', '2026-08-06T10:00:00Z'),
      // Week B: user1 makes 1 mcp call, user3 makes 1 extension call
      entry(USER_1, 'mcp', '2026-08-11T10:00:00Z'),
      entry(USER_3, 'extension', '2026-08-12T10:00:00Z'),
      // Outside the queried range (after end week) — must not count
      entry(USER_2, 'api', '2026-08-18T10:00:00Z'),
      // Excluded internal account — must not count anywhere
      ...(EXCLUDED_ANALYTICS_USER_IDS[0]
        ? [entry(EXCLUDED_ANALYTICS_USER_IDS[0], 'mcp', '2026-08-11T12:00:00Z')]
        : []),
    ]);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  it('returns a dense weekly series of per-source users and calls', async () => {
    const result = await service.getApiUsageStats({
      endWeek: END_WEEK,
      weeks: 3,
    });

    expect(result.dataPoints).toHaveLength(3);
    expect(result.periodStart).toBe(EMPTY_WEEK);
    expect(result.periodEnd).toBe(WEEK_B);

    const [empty, weekA, weekB] = result.dataPoints;
    expect(empty).toEqual({ weekStart: EMPTY_WEEK, sources: [] });

    expect(weekA!.weekStart).toBe(WEEK_A);
    expect(weekA!.sources).toEqual([
      { source: 'mcp', users: 1, calls: 3 },
      { source: 'api', users: 1, calls: 1 },
    ]);

    expect(weekB!.weekStart).toBe(WEEK_B);
    // Ties on calls sort alphabetically by source for determinism.
    expect(weekB!.sources).toEqual([
      { source: 'extension', users: 1, calls: 1 },
      { source: 'mcp', users: 1, calls: 1 },
    ]);
  });

  it('returns per-source period totals with top endpoints', async () => {
    const result = await service.getApiUsageStats({
      endWeek: END_WEEK,
      weeks: 3,
    });

    expect(result.totals).toEqual([
      {
        source: 'mcp',
        users: 1,
        calls: 4,
        topEndpoints: [
          { method: 'GET', endpoint: '/xrpc/cards/:id', calls: 3, users: 1 },
          { method: 'POST', endpoint: '/xrpc/cards', calls: 1, users: 1 },
        ],
      },
      {
        source: 'api',
        users: 1,
        calls: 1,
        topEndpoints: [
          { method: 'GET', endpoint: '/xrpc/cards/:id', calls: 1, users: 1 },
        ],
      },
      {
        source: 'extension',
        users: 1,
        calls: 1,
        topEndpoints: [
          { method: 'GET', endpoint: '/xrpc/cards/:id', calls: 1, users: 1 },
        ],
      },
    ]);
  });
});
