import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';
import { users } from '../../../user/infrastructure/repositories/schema/user.sql';
import { onboardingState } from '../../../user/infrastructure/repositories/schema/onboardingState.sql';
import { follows } from '../../../user/infrastructure/repositories/schema/follows.sql';
import { cards } from '../../../cards/infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../../cards/infrastructure/repositories/schema/collection.sql';
import { connections } from '../../../cards/infrastructure/repositories/schema/connection.sql';
import { notifications } from '../../../notifications/infrastructure/repositories/schema/notification.sql';
import { RetentionQueryService } from '../../infrastructure/repositories/query-services/RetentionQueryService';
import { EXCLUDED_ANALYTICS_USER_IDS } from '../../infrastructure/repositories/query-services/excludedUsers';

const ALICE = 'did:plc:retentionalice';
const BOB = 'did:plc:retentionbob';
const CARA = 'did:plc:retentioncara';
const DAN = 'did:plc:retentiondan';
const EXCLUDED = EXCLUDED_ANALYTICS_USER_IDS[0]!;

// Cohort weeks under test (ISO Mondays, UTC), all safely in the past so the
// "never past the current in-progress week" clamp can't affect results:
//   2026-07-06  cohort of ALICE + BOB (+ EXCLUDED)
//   2026-07-13  cohort of CARA
//   2026-07-20  empty cohort
//   2026-07-27  cohort of DAN (end week — no completed offsets yet)
const WEEK_1 = '2026-07-06T00:00:00.000Z';
const WEEK_2 = '2026-07-13T00:00:00.000Z';
const WEEK_3 = '2026-07-20T00:00:00.000Z';
const WEEK_4 = '2026-07-27T00:00:00.000Z';
const END_WEEK = '2026-07-27';

const ALICE_CARD_ID = '11111111-1111-4111-8111-111111111111';
const BOB_COLLECTION_ID = '22222222-2222-4222-8222-222222222222';

describe('DrizzleRetentionQueryService', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let service: RetentionQueryService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const client = postgres(container.getConnectionUri());
    db = drizzle(client);
    await createTestSchema(db);
    service = new RetentionQueryService(db);

    await db.insert(users).values([
      {
        id: ALICE,
        linkedAt: new Date('2026-07-06T09:00:00Z'),
        lastLoginAt: new Date(),
      },
      {
        id: BOB,
        linkedAt: new Date('2026-07-08T09:00:00Z'),
        lastLoginAt: new Date(),
      },
      {
        id: CARA,
        linkedAt: new Date('2026-07-16T09:00:00Z'),
        lastLoginAt: new Date(),
      },
      {
        id: DAN,
        linkedAt: new Date('2026-07-27T09:00:00Z'),
        lastLoginAt: new Date(),
      },
      // Internal account — must never appear in cohorts or counts
      {
        id: EXCLUDED,
        linkedAt: new Date('2026-07-06T09:00:00Z'),
        lastLoginAt: new Date(),
      },
    ]);

    await db.insert(cards).values([
      // ALICE: URL card at offset 1 (active, not curating)
      {
        id: ALICE_CARD_ID,
        authorId: ALICE,
        type: 'URL',
        contentData: {},
        url: 'https://example.com/a',
        createdAt: new Date('2026-07-15T10:00:00Z'),
      },
      // CARA: card in her own signup week (offset 0 — must not count)
      {
        id: '33333333-3333-4333-8333-333333333333',
        authorId: CARA,
        type: 'URL',
        contentData: {},
        url: 'https://example.com/c',
        createdAt: new Date('2026-07-17T10:00:00Z'),
      },
      // CARA: card BEFORE signup (negative offset — must not count)
      {
        id: '44444444-4444-4444-8444-444444444444',
        authorId: CARA,
        type: 'URL',
        contentData: {},
        url: 'https://example.com/c2',
        createdAt: new Date('2026-07-01T10:00:00Z'),
      },
    ]);

    // Collection owned by an excluded account, created outside the range
    await db.insert(collections).values([
      {
        id: BOB_COLLECTION_ID,
        authorId: EXCLUDED,
        name: 'Internal collection',
        accessType: 'OPEN',
        createdAt: new Date('2026-06-01T10:00:00Z'),
      },
    ]);

    await db.insert(collectionCards).values([
      // ALICE adds a card to a collection at offset 3 (active AND curating)
      {
        id: '55555555-5555-4555-8555-555555555555',
        collectionId: BOB_COLLECTION_ID,
        cardId: ALICE_CARD_ID,
        addedBy: ALICE,
        addedAt: new Date('2026-07-29T10:00:00Z'),
      },
    ]);

    await db.insert(connections).values([
      // BOB creates a connection at offset 1 (active AND curating)
      {
        id: '66666666-6666-4666-8666-666666666666',
        curatorId: BOB,
        sourceType: 'URL',
        sourceValue: 'https://example.com/a',
        targetType: 'URL',
        targetValue: 'https://example.com/b',
        createdAt: new Date('2026-07-14T10:00:00Z'),
      },
      // EXCLUDED account activity — must not count anywhere
      {
        id: '77777777-7777-4777-8777-777777777777',
        curatorId: EXCLUDED,
        sourceType: 'URL',
        sourceValue: 'https://example.com/x',
        targetType: 'URL',
        targetValue: 'https://example.com/y',
        createdAt: new Date('2026-07-14T11:00:00Z'),
      },
    ]);

    await db.insert(follows).values([
      // BOB follows someone at offset 2 (active, not curating)
      {
        followerId: BOB,
        targetId: 'did:plc:someoneelse',
        targetType: 'USER',
        createdAt: new Date('2026-07-21T10:00:00Z'),
      },
    ]);

    await db.insert(onboardingState).values([
      { userId: ALICE, onboardingState: 'COMPLETED' },
      { userId: CARA, onboardingState: 'SKIPPED' },
      { userId: DAN, onboardingState: 'COMPLETED' },
      // BOB has no row => segment 'NONE'
    ]);

    await db.insert(notifications).values([
      // ALICE notified within 7 days of signup => 'notified'
      {
        id: '88888888-8888-4888-8888-888888888888',
        recipientUserId: ALICE,
        actorUserId: BOB,
        type: 'CARD_COLLECTED',
        metadata: {},
        createdAt: new Date('2026-07-08T12:00:00Z'),
      },
      // CARA notified AFTER her first week => still 'not_notified'
      {
        id: '99999999-9999-4999-8999-999999999999',
        recipientUserId: CARA,
        actorUserId: BOB,
        type: 'CARD_COLLECTED',
        metadata: {},
        createdAt: new Date('2026-07-30T12:00:00Z'),
      },
    ]);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  describe('getRetentionStats', () => {
    it('returns a gap-filled cohort triangle with both activity tiers', async () => {
      const result = await service.getRetentionStats({
        endWeek: END_WEEK,
        weeks: 4,
      });

      expect(result.periodStart).toBe(WEEK_1);
      expect(result.periodEnd).toBe(WEEK_4);
      expect(result.dataPoints).toEqual([
        {
          cohortWeekStart: WEEK_1,
          cohortSize: 2, // ALICE + BOB; EXCLUDED filtered out
          weeks: [
            // offset 1: ALICE (card) + BOB (connection); only BOB curates
            { weekOffset: 1, activeUsers: 2, curatingUsers: 1 },
            // offset 2: BOB (follow) — active, not curating
            { weekOffset: 2, activeUsers: 1, curatingUsers: 0 },
            // offset 3: ALICE (collection add) — active AND curating
            { weekOffset: 3, activeUsers: 1, curatingUsers: 1 },
          ],
        },
        {
          cohortWeekStart: WEEK_2,
          cohortSize: 1, // CARA — signup-week and pre-signup cards don't count
          weeks: [
            { weekOffset: 1, activeUsers: 0, curatingUsers: 0 },
            { weekOffset: 2, activeUsers: 0, curatingUsers: 0 },
          ],
        },
        {
          cohortWeekStart: WEEK_3,
          cohortSize: 0, // empty cohort still appears, gap-filled
          weeks: [{ weekOffset: 1, activeUsers: 0, curatingUsers: 0 }],
        },
        {
          cohortWeekStart: WEEK_4,
          cohortSize: 1, // DAN — end-week cohort has no completed offsets yet
          weeks: [],
        },
      ]);
    });

    it('restricts cohorts to the requested weeks', async () => {
      const result = await service.getRetentionStats({
        endWeek: END_WEEK,
        weeks: 2,
      });

      expect(result.dataPoints.map((d) => d.cohortWeekStart)).toEqual([
        WEEK_3,
        WEEK_4,
      ]);
    });
  });

  describe('getRetentionSegmentsStats', () => {
    it('splits pooled cohorts by onboarding state with right-censored denominators', async () => {
      const result = await service.getRetentionSegmentsStats({
        endWeek: END_WEEK,
        weeks: 4,
        segmentBy: 'onboardingState',
      });

      expect(result.segmentBy).toBe('onboardingState');
      expect(result.periodStart).toBe(WEEK_1);
      expect(result.periodEnd).toBe(WEEK_4);
      // Sorted by userCount desc, then segment asc
      expect(result.dataPoints).toEqual([
        {
          segment: 'COMPLETED',
          userCount: 2, // ALICE (week 1) + DAN (week 4)
          weeks: [
            // DAN's cohort is too recent for any offset => eligible is 1 (ALICE)
            {
              weekOffset: 1,
              eligibleUsers: 1,
              activeUsers: 1,
              curatingUsers: 0,
            },
            {
              weekOffset: 2,
              eligibleUsers: 1,
              activeUsers: 0,
              curatingUsers: 0,
            },
            {
              weekOffset: 3,
              eligibleUsers: 1,
              activeUsers: 1,
              curatingUsers: 1,
            },
          ],
        },
        {
          segment: 'NONE', // BOB has no onboarding_state row
          userCount: 1,
          weeks: [
            {
              weekOffset: 1,
              eligibleUsers: 1,
              activeUsers: 1,
              curatingUsers: 1,
            },
            {
              weekOffset: 2,
              eligibleUsers: 1,
              activeUsers: 1,
              curatingUsers: 0,
            },
            {
              weekOffset: 3,
              eligibleUsers: 1,
              activeUsers: 0,
              curatingUsers: 0,
            },
          ],
        },
        {
          segment: 'SKIPPED',
          userCount: 1, // CARA (week 2) — not eligible for offset 3
          weeks: [
            {
              weekOffset: 1,
              eligibleUsers: 1,
              activeUsers: 0,
              curatingUsers: 0,
            },
            {
              weekOffset: 2,
              eligibleUsers: 1,
              activeUsers: 0,
              curatingUsers: 0,
            },
            {
              weekOffset: 3,
              eligibleUsers: 0,
              activeUsers: 0,
              curatingUsers: 0,
            },
          ],
        },
      ]);
    });

    it('splits by first-week notification receipt', async () => {
      const result = await service.getRetentionSegmentsStats({
        endWeek: END_WEEK,
        weeks: 4,
        segmentBy: 'notifiedFirstWeek',
      });

      const bySegment = new Map(result.dataPoints.map((d) => [d.segment, d]));
      // CARA's notification came after her first week => not_notified
      expect(bySegment.get('not_notified')?.userCount).toBe(3); // BOB, CARA, DAN
      expect(bySegment.get('notified')?.userCount).toBe(1); // ALICE
      expect(bySegment.get('notified')?.weeks[0]).toEqual({
        weekOffset: 1,
        eligibleUsers: 1,
        activeUsers: 1,
        curatingUsers: 0,
      });
      // Sorted by userCount desc
      expect(result.dataPoints[0]?.segment).toBe('not_notified');
    });

    it('rejects an unknown segmentBy', async () => {
      await expect(
        service.getRetentionSegmentsStats({
          endWeek: END_WEEK,
          weeks: 4,
          segmentBy: 'shoeSize' as never,
        }),
      ).rejects.toThrow(/segmentBy must be one of/);
    });
  });
});
