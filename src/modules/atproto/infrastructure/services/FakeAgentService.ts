import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { Agent, AtpAgent } from '@atproto/api';
import { ATPROTO_SERVICE_ENDPOINTS } from './ServiceEndpoints';

export class FakeAgentService implements IAgentService {
  getUnauthenticatedAgent(): Result<Agent, Error> {
    try {
      // Create a mock agent - in a real implementation this would be a proper Agent instance
      const mockAgent = {
        getProfile: async ({ actor }: { actor: string }) => {
          const mockData = this.getMockDataForUserId(actor);
          return {
            success: true,
            data: {
              did: actor,
              handle: mockData.handle,
              displayName: mockData.name,
              description: mockData.bio,
              avatar: mockData.avatarUrl,
            },
          };
        },
        resolveHandle: async ({ handle }: { handle: string }) => {
          const mockData = this.getMockDataForHandle(handle);
          return {
            success: true,
            data: {
              did: mockData.did,
            },
          };
        },
      } as Agent;

      return ok(mockAgent);
    } catch (error: any) {
      return err(error);
    }
  }

  async getUnauthenticatedAgentForDid(did: DID): Promise<Result<Agent, Error>> {
    try {
      // For the fake service, just return the same mock agent as getUnauthenticatedAgent
      return this.getUnauthenticatedAgent();
    } catch (error: any) {
      return err(error);
    }
  }

  async getAuthenticatedAgent(did: DID): Promise<Result<Agent, Error>> {
    try {
      // Return the same mock agent for authenticated requests
      // uncomment the line below to test error handling
      // throw new Error('Not implemented in FakeAgentService');
      return this.getUnauthenticatedAgent();
    } catch (error: any) {
      return err(error);
    }
  }

  async getAuthenticatedServiceAccountAgent(): Promise<Result<Agent, Error>> {
    try {
      const serviceAccountIdentifier =
        process.env.BSKY_SERVICE_ACCOUNT_IDENTIFIER;
      const serviceAccountAppPassword =
        process.env.BSKY_SERVICE_ACCOUNT_APP_PASSWORD;

      if (!serviceAccountIdentifier || !serviceAccountAppPassword) {
        return err(
          new Error(
            'Service account credentials not configured. Please set BSKY_SERVICE_ACCOUNT_IDENTIFIER and BSKY_SERVICE_ACCOUNT_APP_PASSWORD environment variables.',
          ),
        );
      }

      const agent = new AtpAgent({
        service: ATPROTO_SERVICE_ENDPOINTS.AUTHENTICATED_BSKY_SERVICE,
      });

      await agent.login({
        identifier: serviceAccountIdentifier,
        password: serviceAccountAppPassword,
      });

      return ok(agent);
    } catch (error: any) {
      return err(
        new Error(
          `Failed to authenticate service account: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  private getMockDataForUserId(userId: string): {
    name: string;
    handle: string;
    avatarUrl: string;
    bio: string;
    did: string;
  } {
    const did2 = process.env.BSKY_DID_2 || 'did:plc:mock456';

    if (userId === did2) {
      return {
        name: 'Mock User Bob',
        handle: process.env.BSKY_HANDLE_2 || 'bob.bsky.social',
        avatarUrl:
          'https://cdn.bsky.app/img/avatar/plain/did:plc:rlknsba2qldjkicxsmni3vyn/bafkreid4nmxspygkftep5b3m2wlcm3xvnwefkswzej7dhipojjxylkzfby@jpeg',
        bio: 'This is Bob - a second mock profile for testing purposes (https://semble.so/), made by @cosmik.network.',
        did: did2,
      };
    }

    // Default to account 1
    const did1 = process.env.BSKY_DID_1 || 'did:plc:mock123';
    return {
      name: 'Mock User Alice',
      handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
      avatarUrl:
        'https://cdn.bsky.app/img/avatar/plain/did:plc:rlknsba2qldjkicxsmni3vyn/bafkreid4nmxspygkftep5b3m2wlcm3xvnwefkswzej7dhipojjxylkzfby@jpeg',
      bio: 'This is Alice - a mock profile for testing purposes (https://semble.so/), made by @cosmik.network.',
      did: did1,
    };
  }

  private getMockDataForHandle(handle: string): {
    did: string;
    handle: string;
  } {
    // Check if handle matches account 2
    const handle2 = process.env.BSKY_HANDLE_2 || 'bob.bsky.social';
    if (handle === handle2 || handle.includes('bob')) {
      return {
        did: process.env.BSKY_DID_2 || 'did:plc:mock456',
        handle: handle2,
      };
    }

    // Default to account 1
    return {
      did: process.env.BSKY_DID_1 || 'did:plc:mock123',
      handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
    };
  }
}
