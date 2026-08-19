import {
  IProfileService,
  UserProfile,
} from 'src/modules/cards/domain/services/IProfileService';
import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';

export class BlueskyProfileService implements IProfileService {
  constructor(private readonly agentService: IAgentService) {}

  /**
   * Profile data is fully public: `app.bsky.actor.getProfile` against the
   * public AppView returns the same displayName/handle/avatar/banner/bio
   * regardless of viewer, and follow state is derived from our own DB.
   *
   * Deliberately does NOT use the caller's authenticated agent: every call
   * through an OAuth session costs a session-store read + distributed lock
   * (and a restore() on top), and profile fetches fan out per-author on
   * feeds and collection pages. The `callerDid` parameter is kept for
   * interface compatibility but unused.
   */
  async getProfile(
    userId: string,
    _callerDid?: string,
  ): Promise<Result<UserProfile>> {
    try {
      const agentResult = this.agentService.getUnauthenticatedAgent();
      if (agentResult.isErr()) {
        return err(
          new Error(
            `Failed to get unauthenticated agent: ${agentResult.error.message}`,
          ),
        );
      }
      const agent = agentResult.value;

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
