import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IProductAnalyticsQueryRepository,
  AnalyticsWeekOptions,
  WacStatsDTO,
  ActivationFunnelStatsDTO,
  ApiUsageStatsDTO,
  OnboardingStatsRaw,
  RetentionStatsDTO,
  RetentionSegmentBy,
  RetentionSegmentsStatsDTO,
} from '../../domain/IProductAnalyticsQueryRepository';
import { ApiUsageQueryService } from './query-services/ApiUsageQueryService';
import { WacQueryService } from './query-services/WacQueryService';
import { ActivationFunnelQueryService } from './query-services/ActivationFunnelQueryService';
import { OnboardingStatsQueryService } from './query-services/OnboardingStatsQueryService';
import { RetentionQueryService } from './query-services/RetentionQueryService';

export class DrizzleProductAnalyticsQueryRepository implements IProductAnalyticsQueryRepository {
  private wacQueryService: WacQueryService;
  private apiUsageQueryService: ApiUsageQueryService;
  private activationFunnelQueryService: ActivationFunnelQueryService;
  private onboardingStatsQueryService: OnboardingStatsQueryService;
  private retentionQueryService: RetentionQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.wacQueryService = new WacQueryService(db);
    this.apiUsageQueryService = new ApiUsageQueryService(db);
    this.activationFunnelQueryService = new ActivationFunnelQueryService(db);
    this.onboardingStatsQueryService = new OnboardingStatsQueryService(db);
    this.retentionQueryService = new RetentionQueryService(db);
  }

  async getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO> {
    return this.wacQueryService.getWacStats(options);
  }

  async getApiUsageStats(
    options: AnalyticsWeekOptions,
  ): Promise<ApiUsageStatsDTO> {
    return this.apiUsageQueryService.getApiUsageStats(options);
  }

  async getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO> {
    return this.activationFunnelQueryService.getActivationFunnelStats(options);
  }

  async getRetentionStats(
    options: AnalyticsWeekOptions,
  ): Promise<RetentionStatsDTO> {
    return this.retentionQueryService.getRetentionStats(options);
  }

  async getRetentionSegmentsStats(
    options: AnalyticsWeekOptions & { segmentBy: RetentionSegmentBy },
  ): Promise<RetentionSegmentsStatsDTO> {
    return this.retentionQueryService.getRetentionSegmentsStats(options);
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
