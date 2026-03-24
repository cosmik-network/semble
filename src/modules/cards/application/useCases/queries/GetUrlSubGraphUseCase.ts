import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { IGraphQueryRepository } from '../../../domain/IGraphQueryRepository';

export interface GetUrlSubGraphQuery {
  url: string;
  depth?: number; // Default 1, max 5
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

export interface GetUrlSubGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalNodeCount: number;
}

export class GetUrlSubGraphUseCase
  implements UseCase<GetUrlSubGraphQuery, Result<GetUrlSubGraphResult>>
{
  constructor(private graphQueryRepo: IGraphQueryRepository) {}

  async execute(
    query: GetUrlSubGraphQuery,
  ): Promise<Result<GetUrlSubGraphResult>> {
    try {
      // Validate URL
      if (!query.url || query.url.trim() === '') {
        return err(new Error('URL is required'));
      }

      // Validate and normalize depth
      const depth = Math.max(1, Math.min(5, query.depth || 1));

      // Fetch URL sub-graph data
      const graphData = await this.graphQueryRepo.getUrlSubGraph(
        query.url,
        depth,
      );

      return ok({
        nodes: graphData.nodes,
        edges: graphData.edges,
        totalNodeCount: graphData.totalNodeCount,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve URL sub-graph data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
