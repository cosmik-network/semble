import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IProductAnalyticsQueryRepository,
  AnalyticsWeekOptions,
  WacStatsDTO,
  ActivationFunnelStatsDTO,
} from '../../domain/IProductAnalyticsQueryRepository';
import { WacQueryService } from './query-services/WacQueryService';
import { ActivationFunnelQueryService } from './query-services/ActivationFunnelQueryService';

export class DrizzleProductAnalyticsQueryRepository implements IProductAnalyticsQueryRepository {
  private wacQueryService: WacQueryService;
  private activationFunnelQueryService: ActivationFunnelQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.wacQueryService = new WacQueryService(db);
    this.activationFunnelQueryService = new ActivationFunnelQueryService(db);
  }

  async getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO> {
    return this.wacQueryService.getWacStats(options);
  }

  async getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO> {
    return this.activationFunnelQueryService.getActivationFunnelStats(options);
  }
}
