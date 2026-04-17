import {
  IProfileService,
  UserProfile,
} from 'src/modules/cards/domain/services/IProfileService';
import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';

export class BlueskyProfileService implements IProfileService {
  constructor(private readonly agentService: IAgentService) {}

  async getProfile(
    userId: string,
    callerDid?: string,
  ): Promise<Result<UserProfile>> {
    try {
      let agent;

      if (callerDid) {
        // Use caller's authenticated agent
        const didResult = DID.create(callerDid);
        if (didResult.isErr()) {
          return err(
            new Error(`Invalid caller DID: ${didResult.error.message}`),
          );
        }

        const agentResult = await this.agentService.getAuthenticatedAgent(
          didResult.value,
        );
        if (agentResult.isErr()) {
          return err(
            new AuthenticationError(
              `Failed to get authenticated agent for BlueskyProfileService: ${agentResult.error.message}`,
            ),
          );
        }
        agent = agentResult.value;
      } else {
        // Fall back to unauthenticated agent for public profiles
        const agentResult = this.agentService.getUnauthenticatedAgent();
        if (agentResult.isErr()) {
          return err(
            new Error(
              `Failed to get unauthenticated agent: ${agentResult.error.message}`,
            ),
          );
        }
        agent = agentResult.value;
      }

      if (!agent) {
        return err(new Error('No authenticated agent available'));
      }

      // Fetch the profile using the ATProto API
      const profileResult = await agent.getProfile({ actor: userId });

      if (!profileResult.success) {
        return err(
          new Error(
            `Failed to fetch profile ${userId}: ${JSON.stringify(profileResult)}`,
          ),
        );
      }

      const profile = profileResult.data;

      // Map ATProto profile data to our UserProfile interface
      const userProfile: UserProfile = {
        id: userId,
        name: profile.displayName || profile.handle,
        handle: profile.handle,
        avatarUrl: profile.avatar,
        bannerUrl: profile.banner,
        bio: profile.description,
        labels: profile.labels,
      };

      return ok(userProfile);
    } catch (error) {
      return err(
        new Error(
          `Error fetching profile: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
