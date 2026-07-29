import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from 'src/modules/atproto/application/IAgentService';
import { DID } from 'src/modules/atproto/domain/DID';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

const MAX_BSKY_FOLLOWS = 1000;
const BSKY_FOLLOWS_PAGE_SIZE = 100; // app.bsky.graph.getFollows max per page

/**
 * Resolves which of the accounts a user follows on Bluesky are Semble users.
 */
export class BskyFollowsService {
  constructor(
    private agentService: IAgentService,
    private userRepository: IUserRepository,
  ) {}

  /**
   * Get the DIDs of Semble users that the caller follows on Bluesky.
   * Fetches up to `maxFollows` follows via the caller's authenticated agent,
   * then intersects them with the Semble user DB.
   */
  async getSembleUsersFollowedOnBsky(
    callerDid: string,
    maxFollows: number = MAX_BSKY_FOLLOWS,
  ): Promise<Result<Set<string>>> {
    try {
      const didResult = DID.create(callerDid);
      if (didResult.isErr()) {
        return err(new Error(`Invalid caller DID: ${didResult.error.message}`));
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        didResult.value,
      );
      if (agentResult.isErr()) {
        return err(
          new Error(
            `Failed to get authenticated agent: ${agentResult.error.message}`,
          ),
        );
      }
      const agent = agentResult.value;

      // Paginate getFollows (max 100 per page) up to maxFollows
      const followedDids: string[] = [];
      let cursor: string | undefined;
      while (followedDids.length < maxFollows) {
        const response = await agent.getFollows({
          actor: callerDid,
          limit: Math.min(
            BSKY_FOLLOWS_PAGE_SIZE,
            maxFollows - followedDids.length,
          ),
          cursor,
        });

        if (!response.success) {
          return err(new Error('Failed to fetch Bluesky follows'));
        }

        followedDids.push(...response.data.follows.map((f) => f.did));

        cursor = response.data.cursor;
        if (!cursor || response.data.follows.length === 0) {
          break;
        }
      }

      // Intersect with Semble users
      const existingResult =
        await this.userRepository.findExistingDIDs(followedDids);
      if (existingResult.isErr()) {
        return err(
          new Error(
            `Failed to look up Semble users: ${existingResult.error.message}`,
          ),
        );
      }

      return ok(new Set(existingResult.value));
    } catch (error) {
      return err(
        new Error(
          `Failed to get Bluesky follows: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
