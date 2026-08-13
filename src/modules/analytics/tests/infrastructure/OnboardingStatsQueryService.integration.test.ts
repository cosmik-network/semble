import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';
import { users } from '../../../user/infrastructure/repositories/schema/user.sql';
import { onboardingState } from '../../../user/infrastructure/repositories/schema/onboardingState.sql';
import { OnboardingStatsQueryService } from '../../infrastructure/repositories/query-services/OnboardingStatsQueryService';
import { EXCLUDED_ANALYTICS_USER_IDS } from '../../infrastructure/repositories/query-services/excludedUsers';

// Cohort week under test: Mon 2026-08-10 .. Sun 2026-08-16 (after the
// ONBOARDING_LAUNCH_DATE of 2026-08-01). Prior week: 2026-08-03 .. 2026-08-09.
const COHORT_END_WEEK = '2026-08-10';
const COHORT_WEEK_START_ISO = '2026-08-10T00:00:00.000Z';

const USER_A = 'did:plc:usera'; // cohort week, full onboarding row
const USER_B = 'did:plc:userb'; // cohort week, no onboarding row
const USER_C = 'did:plc:userc'; // prior week, partial onboarding row
const USER_PRELAUNCH = 'did:plc:prelaunch'; // before launch date
const USER_EXCLUDED = EXCLUDED_ANALYTICS_USER_IDS[0]!; // internal account

const FIRST_COLLECTION_UUID = '11111111-1111-4111-8111-111111111111';

function seedUser(id: string, linkedAt: Date) {
  return { id, handle: `${id}.test`, linkedAt, lastLoginAt: linkedAt };
}

describe('DrizzleOnboardingStatsQueryService', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let service: OnboardingStatsQueryService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const client = postgres(container.getConnectionUri());
    db = drizzle(client);
    service = new OnboardingStatsQueryService(db);
    await createTestSchema(db);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(onboardingState);
    await db.delete(users);
  });

  async function seedFixture() {
    await db
      .insert(users)
      .values([
        seedUser(USER_A, new Date('2026-08-10T10:00:00Z')),
        seedUser(USER_B, new Date('2026-08-11T10:00:00Z')),
        seedUser(USER_C, new Date('2026-08-04T10:00:00Z')),
        seedUser(USER_PRELAUNCH, new Date('2026-07-20T10:00:00Z')),
        seedUser(USER_EXCLUDED, new Date('2026-08-10T10:00:00Z')),
      ]);

    await db.insert(onboardingState).values([
      {
        userId: USER_A,
        onboardingState: 'COMPLETED',
        topicsSelected: ['ai', 'science'],
        linksSelected: ['https://example.com/a'],
        followedCollections: ['not-a-uuid'], // malformed value must not break SQL
        firstCollection: FIRST_COLLECTION_UUID,
        pwaClicked: new Date('2026-08-10T11:00:00Z'),
      },
      {
        userId: USER_C,
        onboardingState: 'IN_PROGRESS',
        topicsSelected: ['ai', 'history'],
        intention: ['research'],
      },
      {
        userId: USER_PRELAUNCH,
        onboardingState: 'COMPLETED',
        topicsSelected: ['ai'],
      },
      {
        userId: USER_EXCLUDED,
        onboardingState: 'COMPLETED',
        topicsSelected: ['ai'],
      },
    ]);
  }

  describe('getWeeklyStats', () => {
    it('computes signup counts, dimension counts, and per-value stats for the cohort week', async () => {
      await seedFixture();

      const result = await service.getWeeklyStats({
        endWeek: COHORT_END_WEEK,
      });

      expect(result.cohortWeekStart).toBe(COHORT_WEEK_START_ISO);
      // Pre-launch and excluded users don't count anywhere.
      expect(result.totalNewUserCount).toBe(3); // A, B, C
      expect(result.weeklyNewUsersCount).toBe(2); // A, B

      // Dimension-level counts
      expect(result.dimensions.topicsSelected.totalUserCount).toBe(2); // A, C
      expect(result.dimensions.topicsSelected.weeklyUserCount).toBe(1); // A
      expect(result.dimensions.topicsSelected.weeklyUserIds).toEqual([USER_A]);

      // Per-value stats: only values present in the cohort week survive,
      // but totals span all users since launch.
      const topicStats = result.dimensions.topicsSelected.stats;
      expect(topicStats.map((s) => s.value).sort()).toEqual(['ai', 'science']);
      const ai = topicStats.find((s) => s.value === 'ai')!;
      expect(ai.totalUserCount).toBe(2); // A + C
      expect(ai.weeklyUserCount).toBe(1); // A
      expect(ai.weeklyUserIds).toEqual([USER_A]);
      const science = topicStats.find((s) => s.value === 'science')!;
      expect(science.totalUserCount).toBe(1);
      expect(science.weeklyUserCount).toBe(1);

      // 'history' was only selected in the prior week => absent from weekly stats
      expect(topicStats.find((s) => s.value === 'history')).toBeUndefined();

      // Malformed UUID values are still counted (validation happens at hydration)
      expect(result.dimensions.followedCollections.totalUserCount).toBe(1);
      expect(
        result.dimensions.followedCollections.stats.map((s) => s.value),
      ).toEqual(['not-a-uuid']);
    });

    it('buckets users without an onboarding row as NOT_STARTED', async () => {
      await seedFixture();

      const result = await service.getWeeklyStats({
        endWeek: COHORT_END_WEEK,
      });

      const byState = new Map(result.onboardingState.map((s) => [s.state, s]));
      expect(byState.get('COMPLETED')?.totalUserCount).toBe(1); // A
      expect(byState.get('COMPLETED')?.weeklyUserIds).toEqual([USER_A]);
      expect(byState.get('IN_PROGRESS')?.totalUserCount).toBe(1); // C
      expect(byState.get('IN_PROGRESS')?.weeklyUserCount).toBe(0);
      expect(byState.get('NOT_STARTED')?.totalUserCount).toBe(1); // B
      expect(byState.get('NOT_STARTED')?.weeklyUserIds).toEqual([USER_B]);
    });

    it('counts milestones and first collection/connection values', async () => {
      await seedFixture();

      const result = await service.getWeeklyStats({
        endWeek: COHORT_END_WEEK,
      });

      expect(result.milestones.pwaClicked.totalUserCount).toBe(1);
      expect(result.milestones.pwaClicked.weeklyUserCount).toBe(1);
      expect(result.milestones.pwaClicked.weeklyUserIds).toEqual([USER_A]);
      expect(result.milestones.mcpClicked.totalUserCount).toBe(0);

      expect(result.firstCollection.totalUserCount).toBe(1);
      expect(result.firstCollection.weeklyValues).toEqual([
        { userId: USER_A, value: FIRST_COLLECTION_UUID },
      ]);
      expect(result.firstConnection.totalUserCount).toBe(0);
      expect(result.firstConnection.weeklyValues).toEqual([]);
    });

    it('returns zero weekly counts for an empty cohort week while keeping totals', async () => {
      await seedFixture();

      const result = await service.getWeeklyStats({ endWeek: '2026-09-07' });

      expect(result.totalNewUserCount).toBe(3);
      expect(result.weeklyNewUsersCount).toBe(0);
      expect(result.dimensions.topicsSelected.totalUserCount).toBe(2);
      expect(result.dimensions.topicsSelected.weeklyUserCount).toBe(0);
      expect(result.dimensions.topicsSelected.weeklyUserIds).toEqual([]);
      // No values in the cohort week => empty per-value stats
      expect(result.dimensions.topicsSelected.stats).toEqual([]);
      expect(result.firstCollection.weeklyValues).toEqual([]);
    });

    it('returns an all-zero response when there is no data at all', async () => {
      const result = await service.getWeeklyStats({
        endWeek: COHORT_END_WEEK,
      });

      expect(result.totalNewUserCount).toBe(0);
      expect(result.weeklyNewUsersCount).toBe(0);
      expect(result.onboardingState).toEqual([]);
      expect(result.dimensions.topicsSelected.stats).toEqual([]);
      expect(result.milestones.pwaClicked.totalUserCount).toBe(0);
    });
  });

  describe('getSummaryStats', () => {
    it('returns since-launch ranked totals with no weekly data', async () => {
      await seedFixture();

      const result = await service.getSummaryStats();

      expect(result.cohortWeekStart).toBeNull();
      expect(result.totalNewUserCount).toBe(3);
      expect(result.weeklyNewUsersCount).toBe(0);

      const topicStats = result.dimensions.topicsSelected.stats;
      // Ranked by totalUserCount DESC, then value: all values included
      expect(topicStats.map((s) => s.value)).toEqual([
        'ai',
        'history',
        'science',
      ]);
      expect(topicStats[0]!.totalUserCount).toBe(2);
      expect(topicStats[0]!.weeklyUserCount).toBe(0);
      expect(topicStats[0]!.weeklyUserIds).toEqual([]);

      expect(result.dimensions.intention.stats.map((s) => s.value)).toEqual([
        'research',
      ]);
      expect(result.firstCollection.totalUserCount).toBe(1);
      expect(result.firstCollection.weeklyValues).toEqual([]);
    });
  });
});
