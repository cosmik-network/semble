import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IGraphQueryRepository,
  GraphDataDTO,
} from '../../domain/IGraphQueryRepository';
import { GraphQueryService } from './query-services/GraphQueryService';
import { UrlGraphTraversalService } from './query-services/UrlGraphTraversalService';

export class DrizzleGraphQueryRepository implements IGraphQueryRepository {
  private graphQueryService: GraphQueryService;
  private urlGraphTraversalService: UrlGraphTraversalService;

  constructor(private db: PostgresJsDatabase) {
    this.graphQueryService = new GraphQueryService(db);
    this.urlGraphTraversalService = new UrlGraphTraversalService(db);
  }

  async getGraphData(
    page?: number,
    limit?: number,
    userId?: string,
  ): Promise<GraphDataDTO> {
    return this.graphQueryService.getGraphData(page, limit, userId);
  }

  async getUrlSubGraph(url: string, depth: number): Promise<GraphDataDTO> {
    return this.urlGraphTraversalService.getUrlSubGraph(url, depth);
  }
}
