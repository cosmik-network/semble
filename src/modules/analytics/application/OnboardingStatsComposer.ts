import {
  IProductAnalyticsQueryRepository,
  OnboardingDimensionCountsRaw,
  OnboardingStatsRaw,
  OnboardingValueStatRaw,
} from '../domain/IProductAnalyticsQueryRepository';
import { Result } from '../../../shared/core/Result';
import { BatchProfileFetcher } from '../../cards/application/services/BatchProfileFetcher';
import { ProfileMapper } from '../../cards/application/mappers/ProfileMapper';
import { UserProfile } from '../../cards/domain/services/IProfileService';
import { ICollectionRepository } from '../../cards/domain/ICollectionRepository';
import { IConnectionRepository } from '../../cards/domain/IConnectionRepository';
import { Collection } from '../../cards/domain/Collection';
import { Connection } from '../../cards/domain/Connection';
import { CollectionId } from '../../cards/domain/value-objects/CollectionId';
import { ConnectionId } from '../../cards/domain/value-objects/ConnectionId';

// Hydrated response DTOs (plain TS, matching the /wac precedent of no zod contract)

export interface OnboardingMinimalProfileDTO {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

/** Only `id` is guaranteed — the rest is absent when the stored UUID didn't resolve. */
export interface OnboardingCollectionDTO {
  id: string;
  name?: string;
  description?: string;
  cardCount?: number;
  createdAt?: string;
  author?: OnboardingMinimalProfileDTO;
}

/** Only `id` is guaranteed — the rest is absent when the stored UUID didn't resolve. */
export interface OnboardingConnectionDTO {
  id: string;
  type?: string;
  note?: string;
  createdAt?: string;
  source?: string; // URL or card id string
  target?: string;
}

export interface OnboardingWeeklyCounts {
  totalUserCount: number;
  weeklyUserCount: number;
  weeklyUsers: OnboardingMinimalProfileDTO[];
}

export interface OnboardingSummaryCounts {
  totalUserCount: number;
}

type WeeklyValueStats<K extends string, V> = OnboardingWeeklyCounts & {
  stats: Array<{ [key in K]: V } & OnboardingWeeklyCounts>;
};

type SummaryValueStats<K extends string, V> = OnboardingSummaryCounts & {
  stats: Array<{ [key in K]: V } & OnboardingSummaryCounts>;
};

export interface OnboardingWeeklyStatsDTO {
  cohortWeekStart: string;
  totalNewUserCount: number;
  weeklyNewUsersCount: number;
  onboardingState: {
    stats: Array<{ state: string } & OnboardingWeeklyCounts>;
  };
  topicsSelected: WeeklyValueStats<'topic', string>;
  linksSuggested: WeeklyValueStats<'link', string>;
  linksSelected: WeeklyValueStats<'link', string>;
  suggestedAccounts: WeeklyValueStats<'user', OnboardingMinimalProfileDTO>;
  suggestedCollections: WeeklyValueStats<'collection', OnboardingCollectionDTO>;
  followedAccounts: WeeklyValueStats<'user', OnboardingMinimalProfileDTO>;
  followedCollections: WeeklyValueStats<'collection', OnboardingCollectionDTO>;
  firstCards: WeeklyValueStats<'link', string>;
  firstCollections: OnboardingWeeklyCounts & {
    stats: Array<{
      collection: OnboardingCollectionDTO;
      creator?: OnboardingMinimalProfileDTO;
    }>;
  };
  firstConnection: OnboardingWeeklyCounts & {
    stats: Array<{
      connection: OnboardingConnectionDTO;
      creator?: OnboardingMinimalProfileDTO;
    }>;
  };
  pwaClicked: OnboardingWeeklyCounts;
  iosShortcutClicked: OnboardingWeeklyCounts;
  browserExtensionClicked: OnboardingWeeklyCounts;
  mcpClicked: OnboardingWeeklyCounts;
  saveModalGuideCompleted: OnboardingWeeklyCounts;
  connectionCreationModalCompleted: OnboardingWeeklyCounts;
  semblePageNavigationCompleted: OnboardingWeeklyCounts;
  intention: WeeklyValueStats<'intention', string>;
  referralSource: WeeklyValueStats<'referralSource', string>;
}

export interface OnboardingSummaryStatsDTO {
  totalNewUserCount: number;
  onboardingState: {
    stats: Array<{ state: string } & OnboardingSummaryCounts>;
  };
  topicsSelected: SummaryValueStats<'topic', string>;
  linksSuggested: SummaryValueStats<'link', string>;
  linksSelected: SummaryValueStats<'link', string>;
  suggestedAccounts: SummaryValueStats<'user', OnboardingMinimalProfileDTO>;
  suggestedCollections: SummaryValueStats<
    'collection',
    OnboardingCollectionDTO
  >;
  followedAccounts: SummaryValueStats<'user', OnboardingMinimalProfileDTO>;
  followedCollections: SummaryValueStats<'collection', OnboardingCollectionDTO>;
  firstCards: SummaryValueStats<'link', string>;
  firstCollections: OnboardingSummaryCounts;
  firstConnection: OnboardingSummaryCounts;
  pwaClicked: OnboardingSummaryCounts;
  iosShortcutClicked: OnboardingSummaryCounts;
  browserExtensionClicked: OnboardingSummaryCounts;
  mcpClicked: OnboardingSummaryCounts;
  saveModalGuideCompleted: OnboardingSummaryCounts;
  connectionCreationModalCompleted: OnboardingSummaryCounts;
  semblePageNavigationCompleted: OnboardingSummaryCounts;
  intention: SummaryValueStats<'intention', string>;
  referralSource: SummaryValueStats<'referralSource', string>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hydrates the raw ID-based onboarding stats into API DTOs:
 * DIDs -> minimal profiles, collection/connection UUIDs -> summaries.
 *
 * Stored values are untrusted client input, so hydration is best-effort:
 * malformed UUIDs / DIDs keep their counts but hydrate to id-only stubs or
 * fallback profiles — never an error.
 */
export class OnboardingStatsComposer {
  constructor(
    private queryRepository: IProductAnalyticsQueryRepository,
    private batchProfileFetcher: BatchProfileFetcher,
    private collectionRepository: ICollectionRepository,
    private connectionRepository: IConnectionRepository,
  ) {}

  async getWeeklyStats(options: {
    endWeek?: string;
  }): Promise<OnboardingWeeklyStatsDTO> {
    const raw = await this.queryRepository.getOnboardingWeeklyStatsRaw(options);
    const ctx = await this.hydrate(raw);

    const counts = (c: OnboardingDimensionCountsRaw): OnboardingWeeklyCounts =>
      this.toWeeklyCounts(c, ctx.profiles);
    const valueStats = <K extends string, V>(
      key: K,
      stats: OnboardingValueStatRaw[],
      mapValue: (value: string) => V,
    ) =>
      stats.map((s) => ({
        [key]: mapValue(s.value),
        ...this.toWeeklyCounts(s, ctx.profiles),
      })) as Array<{ [key in K]: V } & OnboardingWeeklyCounts>;

    const d = raw.dimensions;
    return {
      cohortWeekStart: raw.cohortWeekStart!,
      totalNewUserCount: raw.totalNewUserCount,
      weeklyNewUsersCount: raw.weeklyNewUsersCount,
      onboardingState: {
        stats: raw.onboardingState.map((s) => ({
          state: s.state,
          ...counts(s),
        })),
      },
      topicsSelected: {
        ...counts(d.topicsSelected),
        stats: valueStats('topic', d.topicsSelected.stats, (v) => v),
      },
      linksSuggested: {
        ...counts(d.linksSuggested),
        stats: valueStats('link', d.linksSuggested.stats, (v) => v),
      },
      linksSelected: {
        ...counts(d.linksSelected),
        stats: valueStats('link', d.linksSelected.stats, (v) => v),
      },
      suggestedAccounts: {
        ...counts(d.suggestedAccounts),
        stats: valueStats('user', d.suggestedAccounts.stats, (v) =>
          this.profileFor(ctx.profiles, v),
        ),
      },
      suggestedCollections: {
        ...counts(d.suggestedCollections),
        stats: valueStats('collection', d.suggestedCollections.stats, (v) =>
          this.collectionFor(ctx, v),
        ),
      },
      followedAccounts: {
        ...counts(d.followedAccounts),
        stats: valueStats('user', d.followedAccounts.stats, (v) =>
          this.profileFor(ctx.profiles, v),
        ),
      },
      followedCollections: {
        ...counts(d.followedCollections),
        stats: valueStats('collection', d.followedCollections.stats, (v) =>
          this.collectionFor(ctx, v),
        ),
      },
      firstCards: {
        ...counts(d.firstCards),
        stats: valueStats('link', d.firstCards.stats, (v) => v),
      },
      firstCollections: {
        ...counts(raw.firstCollection),
        stats: raw.firstCollection.weeklyValues.map(({ value }) => {
          const collection = this.collectionFor(ctx, value);
          return { collection, creator: collection.author };
        }),
      },
      firstConnection: {
        ...counts(raw.firstConnection),
        stats: raw.firstConnection.weeklyValues.map(({ value }) => {
          const domainConnection = ctx.connections.get(value);
          return {
            connection: this.connectionFor(value, domainConnection),
            creator: domainConnection
              ? this.profileFor(ctx.profiles, domainConnection.curatorId.value)
              : undefined,
          };
        }),
      },
      pwaClicked: counts(raw.milestones.pwaClicked),
      iosShortcutClicked: counts(raw.milestones.iosShortcutClicked),
      browserExtensionClicked: counts(raw.milestones.browserExtensionClicked),
      mcpClicked: counts(raw.milestones.mcpClicked),
      saveModalGuideCompleted: counts(raw.milestones.saveModalGuideCompleted),
      connectionCreationModalCompleted: counts(
        raw.milestones.connectionCreationModalCompleted,
      ),
      semblePageNavigationCompleted: counts(
        raw.milestones.semblePageNavigationCompleted,
      ),
      intention: {
        ...counts(d.intention),
        stats: valueStats('intention', d.intention.stats, (v) => v),
      },
      referralSource: {
        ...counts(d.referralSource),
        stats: valueStats('referralSource', d.referralSource.stats, (v) => v),
      },
    };
  }

  async getSummaryStats(): Promise<OnboardingSummaryStatsDTO> {
    const raw = await this.queryRepository.getOnboardingSummaryStatsRaw();
    const ctx = await this.hydrate(raw);

    const total = (
      c: OnboardingDimensionCountsRaw,
    ): OnboardingSummaryCounts => ({
      totalUserCount: c.totalUserCount,
    });
    const valueStats = <K extends string, V>(
      key: K,
      stats: OnboardingValueStatRaw[],
      mapValue: (value: string) => V,
    ) =>
      stats.map((s) => ({
        [key]: mapValue(s.value),
        totalUserCount: s.totalUserCount,
      })) as Array<{ [key in K]: V } & OnboardingSummaryCounts>;

    const d = raw.dimensions;
    return {
      totalNewUserCount: raw.totalNewUserCount,
      onboardingState: {
        stats: raw.onboardingState.map((s) => ({
          state: s.state,
          totalUserCount: s.totalUserCount,
        })),
      },
      topicsSelected: {
        ...total(d.topicsSelected),
        stats: valueStats('topic', d.topicsSelected.stats, (v) => v),
      },
      linksSuggested: {
        ...total(d.linksSuggested),
        stats: valueStats('link', d.linksSuggested.stats, (v) => v),
      },
      linksSelected: {
        ...total(d.linksSelected),
        stats: valueStats('link', d.linksSelected.stats, (v) => v),
      },
      suggestedAccounts: {
        ...total(d.suggestedAccounts),
        stats: valueStats('user', d.suggestedAccounts.stats, (v) =>
          this.profileFor(ctx.profiles, v),
        ),
      },
      suggestedCollections: {
        ...total(d.suggestedCollections),
        stats: valueStats('collection', d.suggestedCollections.stats, (v) =>
          this.collectionFor(ctx, v),
        ),
      },
      followedAccounts: {
        ...total(d.followedAccounts),
        stats: valueStats('user', d.followedAccounts.stats, (v) =>
          this.profileFor(ctx.profiles, v),
        ),
      },
      followedCollections: {
        ...total(d.followedCollections),
        stats: valueStats('collection', d.followedCollections.stats, (v) =>
          this.collectionFor(ctx, v),
        ),
      },
      firstCards: {
        ...total(d.firstCards),
        stats: valueStats('link', d.firstCards.stats, (v) => v),
      },
      firstCollections: total(raw.firstCollection),
      firstConnection: total(raw.firstConnection),
      pwaClicked: total(raw.milestones.pwaClicked),
      iosShortcutClicked: total(raw.milestones.iosShortcutClicked),
      browserExtensionClicked: total(raw.milestones.browserExtensionClicked),
      mcpClicked: total(raw.milestones.mcpClicked),
      saveModalGuideCompleted: total(raw.milestones.saveModalGuideCompleted),
      connectionCreationModalCompleted: total(
        raw.milestones.connectionCreationModalCompleted,
      ),
      semblePageNavigationCompleted: total(
        raw.milestones.semblePageNavigationCompleted,
      ),
      intention: {
        ...total(d.intention),
        stats: valueStats('intention', d.intention.stats, (v) => v),
      },
      referralSource: {
        ...total(d.referralSource),
        stats: valueStats('referralSource', d.referralSource.stats, (v) => v),
      },
    };
  }

  /** Fetch every collection, connection, and profile the response will need. */
  private async hydrate(raw: OnboardingStatsRaw): Promise<{
    profiles: Map<string, UserProfile>;
    collections: Map<string, Collection>;
    connections: Map<string, Connection>;
  }> {
    const d = raw.dimensions;

    const collectionUuids = [
      ...d.suggestedCollections.stats.map((s) => s.value),
      ...d.followedCollections.stats.map((s) => s.value),
      ...raw.firstCollection.weeklyValues.map((v) => v.value),
    ];
    const connectionUuids = raw.firstConnection.weeklyValues.map(
      (v) => v.value,
    );

    const [collections, connections] = await Promise.all([
      this.fetchCollections(collectionUuids),
      this.fetchConnections(connectionUuids),
    ]);

    const dids = new Set<string>();
    for (const s of raw.onboardingState) {
      s.weeklyUserIds.forEach((id) => dids.add(id));
    }
    for (const dim of Object.values(d)) {
      dim.weeklyUserIds.forEach((id) => dids.add(id));
      for (const s of dim.stats) s.weeklyUserIds.forEach((id) => dids.add(id));
    }
    for (const m of Object.values(raw.milestones)) {
      m.weeklyUserIds.forEach((id) => dids.add(id));
    }
    raw.firstCollection.weeklyUserIds.forEach((id) => dids.add(id));
    raw.firstConnection.weeklyUserIds.forEach((id) => dids.add(id));
    // Account-dimension values are DIDs themselves (untrusted — keep only did:*)
    for (const s of [
      ...d.suggestedAccounts.stats,
      ...d.followedAccounts.stats,
    ]) {
      if (s.value.startsWith('did:')) dids.add(s.value);
    }
    for (const collection of collections.values()) {
      dids.add(collection.authorId.value);
    }
    for (const connection of connections.values()) {
      dids.add(connection.curatorId.value);
    }

    const profilesResult = await this.batchProfileFetcher.fetchProfileMap(
      Array.from(dids),
      undefined,
      { skipFailures: true, includeFallback: true },
    );
    const profiles = profilesResult.isOk()
      ? profilesResult.value
      : new Map<string, UserProfile>();

    return { profiles, collections, connections };
  }

  private async fetchCollections(
    values: string[],
  ): Promise<Map<string, Collection>> {
    const ids = this.parseUuidIds(values, (v) =>
      CollectionId.createFromString(v),
    );
    if (ids.length === 0) return new Map();

    const result = await this.collectionRepository.findByIds(ids);
    if (result.isErr()) return new Map();

    return new Map(
      result.value.map((c) => [c.collectionId.getStringValue(), c]),
    );
  }

  private async fetchConnections(
    values: string[],
  ): Promise<Map<string, Connection>> {
    const ids = this.parseUuidIds(values, (v) =>
      ConnectionId.createFromString(v),
    );
    if (ids.length === 0) return new Map();

    const result = await this.connectionRepository.findByIds(ids);
    if (result.isErr()) return new Map();

    return new Map(
      result.value.map((c) => [c.connectionId.getStringValue(), c]),
    );
  }

  private parseUuidIds<T>(
    values: string[],
    create: (value: string) => Result<T>,
  ): T[] {
    const ids: T[] = [];
    for (const value of new Set(values)) {
      if (!UUID_REGEX.test(value)) continue;
      const result = create(value);
      if (result.isOk()) ids.push(result.value);
    }
    return ids;
  }

  private toWeeklyCounts(
    c: OnboardingDimensionCountsRaw,
    profiles: Map<string, UserProfile>,
  ): OnboardingWeeklyCounts {
    return {
      totalUserCount: c.totalUserCount,
      weeklyUserCount: c.weeklyUserCount,
      weeklyUsers: c.weeklyUserIds.map((id) => this.profileFor(profiles, id)),
    };
  }

  private profileFor(
    profiles: Map<string, UserProfile>,
    did: string,
  ): OnboardingMinimalProfileDTO {
    const profile = profiles.get(did);
    return profile
      ? ProfileMapper.toMinimalProfile(profile)
      : ProfileMapper.createFallbackProfile(did);
  }

  private collectionFor(
    ctx: {
      profiles: Map<string, UserProfile>;
      collections: Map<string, Collection>;
    },
    uuid: string,
  ): OnboardingCollectionDTO {
    const collection = ctx.collections.get(uuid);
    if (!collection) return { id: uuid };
    return {
      id: uuid,
      name: collection.name.value,
      description: collection.description?.value,
      cardCount: collection.cardCount,
      createdAt: collection.createdAt.toISOString(),
      author: this.profileFor(ctx.profiles, collection.authorId.value),
    };
  }

  private connectionFor(
    uuid: string,
    connection: Connection | undefined,
  ): OnboardingConnectionDTO {
    if (!connection) return { id: uuid };
    return {
      id: uuid,
      type: connection.type?.value,
      note: connection.note?.value,
      createdAt: connection.createdAt.toISOString(),
      source: connection.source.stringValue,
      target: connection.target.stringValue,
    };
  }
}
