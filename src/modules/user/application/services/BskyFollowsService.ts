import { Agent } from '@atproto/api';
import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from 'src/modules/atproto/application/IAgentService';
import { DID } from 'src/modules/atproto/domain/DID';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import {
  IBskyFollowsService,
  BskyFollowedProfile,
} from './IBskyFollowsService';

// Re-exported for backwards compatibility with existing imports
export type { BskyFollowedProfile } from './IBskyFollowsService';

const MAX_BSKY_FOLLOWS = 1000;
const BSKY_FOLLOWS_PAGE_SIZE = 100; // app.bsky.graph.getFollows max per page

/**
 * Resolves which of the accounts a user follows on Bluesky are Semble users.
 */
export class BskyFollowsService implements IBskyFollowsService {
  constructor(
    private agentService: IAgentService,
    private userRepository: IUserRepository,
  ) {}

  /**
   * Get the Semble users that the caller follows on Bluesky, keyed by DID,
   * with the profile data included in the getFollows response.
   * Fetches up to `maxFollows` follows via the caller's authenticated agent,
   * then intersects them with the Semble user DB.
   */
  async getSembleUsersFollowedOnBsky(
    callerDid: string,
    maxFollows: number = MAX_BSKY_FOLLOWS,
  ): Promise<Result<Map<string, BskyFollowedProfile>>> {
    try {
      const didResult = DID.create(callerDid);
      if (didResult.isErr()) {
        return err(new Error(`Invalid caller DID: ${didResult.error.message}`));
      }

      const followsResult = await this.fetchFollows(
        didResult.value,
        callerDid,
        maxFollows,
      );
      if (followsResult.isErr()) {
        return err(followsResult.error);
      }
      const followedProfiles = followsResult.value;

      // Intersect with Semble users
      const existingResult = await this.userRepository.findExistingDIDs(
        Array.from(followedProfiles.keys()),
      );
      if (existingResult.isErr()) {
        return err(
          new Error(
            `Failed to look up Semble users: ${existingResult.error.message}`,
          ),
        );
      }

      const sembleProfiles = new Map<string, BskyFollowedProfile>();
      existingResult.value.forEach((did) => {
        const profile = followedProfiles.get(did);
        if (profile) {
          sembleProfiles.set(did, profile);
        }
      });

      return ok(sembleProfiles);
    } catch (error) {
      return err(
        new Error(
          `Failed to get Bluesky follows: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Fetch the caller's Bluesky follows with the authenticated agent, falling
   * back to the public (unauthenticated) appview if auth is unavailable or the
   * authenticated call fails. Follows are public data, so the fallback returns
   * the same results for any account that isn't blocking the service.
   */
  private async fetchFollows(
    callerDid: DID,
    actor: string,
    maxFollows: number,
  ): Promise<Result<Map<string, BskyFollowedProfile>>> {
    const agentResult =
      await this.agentService.getAuthenticatedAgent(callerDid);

    if (agentResult.isOk()) {
      const authedResult = await this.paginateFollows(
        agentResult.value,
        actor,
        maxFollows,
      );
      if (authedResult.isOk()) {
        return authedResult;
      }
      console.warn(
        `BskyFollowsService: authenticated getFollows failed, falling back to public agent: ${authedResult.error.message}`,
      );
    } else {
      console.warn(
        `BskyFollowsService: no authenticated agent, falling back to public agent: ${agentResult.error.message}`,
      );
    }

    const publicAgentResult = this.agentService.getUnauthenticatedAgent();
    if (publicAgentResult.isErr()) {
      return err(
        new Error(
          `Failed to get public agent: ${publicAgentResult.error.message}`,
        ),
      );
    }

    return this.paginateFollows(publicAgentResult.value, actor, maxFollows);
  }

  /** Paginate getFollows (max 100 per page) up to maxFollows */
  private async paginateFollows(
    agent: Agent,
    actor: string,
    maxFollows: number,
  ): Promise<Result<Map<string, BskyFollowedProfile>>> {
    try {
      const followedProfiles = new Map<string, BskyFollowedProfile>();
      let cursor: string | undefined;
      while (followedProfiles.size < maxFollows) {
        const response = await agent.getFollows({
          actor,
          limit: Math.min(
            BSKY_FOLLOWS_PAGE_SIZE,
            maxFollows - followedProfiles.size,
          ),
          cursor,
        });

        if (!response.success) {
          return err(new Error('Failed to fetch Bluesky follows'));
        }

        response.data.follows.forEach((follow) => {
          followedProfiles.set(follow.did, {
            did: follow.did,
            handle: follow.handle,
            displayName: follow.displayName,
            avatarUrl: follow.avatar,
            description: follow.description,
          });
        });

        cursor = response.data.cursor;
        if (!cursor || response.data.follows.length === 0) {
          break;
        }
      }

      return ok(followedProfiles);
    } catch (error) {
      return err(
        new Error(
          `Failed to fetch Bluesky follows: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
