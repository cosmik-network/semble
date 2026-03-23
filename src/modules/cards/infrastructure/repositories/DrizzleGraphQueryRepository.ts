import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IGraphQueryRepository,
  GraphDataDTO,
} from '../../domain/IGraphQueryRepository';
import { GraphQueryService } from './query-services/GraphQueryService';

export class DrizzleGraphQueryRepository implements IGraphQueryRepository {
  private graphQueryService: GraphQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.graphQueryService = new GraphQueryService(db);
  }

  async getGraphData(page?: number, limit?: number): Promise<GraphDataDTO> {
    return this.graphQueryService.getGraphData(page, limit);
  }
}
