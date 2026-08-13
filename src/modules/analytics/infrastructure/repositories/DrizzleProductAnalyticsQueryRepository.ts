import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IProductAnalyticsQueryRepository,
  AnalyticsWeekOptions,
  WacStatsDTO,
  ActivationFunnelStatsDTO,
  OnboardingStatsRaw,
} from '../../domain/IProductAnalyticsQueryRepository';
import { WacQueryService } from './query-services/WacQueryService';
import { ActivationFunnelQueryService } from './query-services/ActivationFunnelQueryService';
import { OnboardingStatsQueryService } from './query-services/OnboardingStatsQueryService';

export class DrizzleProductAnalyticsQueryRepository implements IProductAnalyticsQueryRepository {
  private wacQueryService: WacQueryService;
  private activationFunnelQueryService: ActivationFunnelQueryService;
  private onboardingStatsQueryService: OnboardingStatsQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.wacQueryService = new WacQueryService(db);
    this.activationFunnelQueryService = new ActivationFunnelQueryService(db);
    this.onboardingStatsQueryService = new OnboardingStatsQueryService(db);
  }

  async getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO> {
    return this.wacQueryService.getWacStats(options);
  }

  async getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO> {
    return this.activationFunnelQueryService.getActivationFunnelStats(options);
  }

  async getOnboardingWeeklyStatsRaw(options: {
    endWeek?: string;
  }): Promise<OnboardingStatsRaw> {
    return this.onboardingStatsQueryService.getWeeklyStats(options);
  }

  async getOnboardingSummaryStatsRaw(): Promise<OnboardingStatsRaw> {
    return this.onboardingStatsQueryService.getSummaryStats();
  }
}
