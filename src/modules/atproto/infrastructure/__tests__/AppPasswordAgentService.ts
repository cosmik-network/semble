import { AtpAgent, Agent } from '@atproto/api';
import { err, ok, Result } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { ATPROTO_SERVICE_ENDPOINTS } from '../services/ServiceEndpoints';

export class AppPasswordAgentService implements IAgentService {
  constructor(private readonly props: { did: string; password: string }) {
    this.props = props;
  }
  getUnauthenticatedAgent(): Result<Agent, Error> {
    return ok(
      new AtpAgent({
        service: ATPROTO_SERVICE_ENDPOINTS.UNAUTHENTICATED_BSKY_SERVICE,
      }),
    );
  }

  async getUnauthenticatedAgentForDid(did: DID): Promise<Result<Agent, Error>> {
    // For test utility, just return the same unauthenticated agent
    return Promise.resolve(this.getUnauthenticatedAgent());
  }

  async getAuthenticatedAgent(did: DID): Promise<Result<Agent, Error>> {
    try {
      const agent = new AtpAgent({
        service: ATPROTO_SERVICE_ENDPOINTS.AUTHENTICATED_BSKY_SERVICE,
      });

      await agent.login({
        identifier: this.props.did,
        password: this.props.password,
      });

      return ok(agent);
    } catch (error) {
      return err(
        new Error(
          `Failed to get authenticated agent: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  async getAuthenticatedServiceAccountAgent(): Promise<Result<Agent, Error>> {
    try {
      const agent = new AtpAgent({
        service: ATPROTO_SERVICE_ENDPOINTS.AUTHENTICATED_BSKY_SERVICE,
      });

      await agent.login({
        identifier: this.props.did,
        password: this.props.password,
      });

      return ok(agent);
    } catch (error) {
      return err(
        new Error(
          `Failed to get authenticated service account agent: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }
}
