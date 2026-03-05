import {
  IGraphQueryRepository,
  GraphDataDTO,
} from '../../domain/IGraphQueryRepository';

export class InMemoryGraphQueryRepository implements IGraphQueryRepository {
  private static instance: InMemoryGraphQueryRepository;

  private constructor() {}

  public static getInstance(): InMemoryGraphQueryRepository {
    if (!InMemoryGraphQueryRepository.instance) {
      InMemoryGraphQueryRepository.instance =
        new InMemoryGraphQueryRepository();
    }
    return InMemoryGraphQueryRepository.instance;
  }

  async getGraphData(): Promise<GraphDataDTO> {
    // For in-memory implementation, return empty graph
    // In a real test scenario, you would populate this with test data
    return { nodes: [], edges: [] };
  }
}
