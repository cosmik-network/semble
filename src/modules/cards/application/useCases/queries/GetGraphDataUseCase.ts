import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { IGraphQueryRepository } from '../../../domain/IGraphQueryRepository';
import { IIdentityResolutionService } from '../../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../../atproto/domain/DIDOrHandle';

export interface GetGraphDataQuery {
  page?: number;
  limit?: number;
  identifier?: string; // Can be DID or handle
}

export interface GraphNode {
  id: string;
  type: 'URL' | 'COLLECTION';
  label: string;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'COLLECTION_CONTAINS_URL' | 'URL_CONNECTS_URL';
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
  constructor(
    private graphQueryRepo: IGraphQueryRepository,
    private identityResolver: IIdentityResolutionService,
  ) {}

  async execute(query: GetGraphDataQuery): Promise<Result<GetGraphDataResult>> {
    try {
      let userId: string | undefined = undefined;

      // If identifier is provided, resolve it to a DID
      if (query.identifier) {
        const identifierResult = DIDOrHandle.create(query.identifier);
        if (identifierResult.isErr()) {
          return err(new Error(`Invalid identifier: ${query.identifier}`));
        }

        const didResult = await this.identityResolver.resolveToDID(
          identifierResult.value,
        );
        if (didResult.isErr()) {
          return err(
            new Error(
              `Failed to resolve identifier: ${didResult.error.message}`,
            ),
          );
        }

        userId = didResult.value.value;
      }

      // Fetch graph data with pagination and optional user scoping
      const graphData = await this.graphQueryRepo.getGraphData(
        query.page,
        query.limit,
        userId,
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
