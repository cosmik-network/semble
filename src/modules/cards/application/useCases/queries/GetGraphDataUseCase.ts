import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { IGraphQueryRepository } from '../../../domain/IGraphQueryRepository';

export interface GetGraphDataQuery {
  page?: number;
  limit?: number;
}

export interface GraphNode {
  id: string;
  type: 'USER' | 'URL' | 'COLLECTION' | 'NOTE';
  label: string;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type:
    | 'USER_FOLLOWS_USER'
    | 'USER_FOLLOWS_COLLECTION'
    | 'USER_AUTHORED_URL'
    | 'NOTE_REFERENCES_URL'
    | 'COLLECTION_CONTAINS_URL'
    | 'URL_CONNECTS_URL';
  metadata?: Record<string, any>;
}

export interface GetGraphDataResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalNodeCount: number;
}

export class GetGraphDataUseCase
  implements UseCase<GetGraphDataQuery, Result<GetGraphDataResult>>
{
  constructor(private graphQueryRepo: IGraphQueryRepository) {}

  async execute(query: GetGraphDataQuery): Promise<Result<GetGraphDataResult>> {
    try {
      // Fetch graph data with pagination
      const graphData = await this.graphQueryRepo.getGraphData(
        query.page,
        query.limit,
      );

      return ok({
        nodes: graphData.nodes,
        edges: graphData.edges,
        totalNodeCount: graphData.totalNodeCount,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve graph data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
