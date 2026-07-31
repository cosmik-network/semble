import { Result, ok, err } from 'src/shared/core/Result';
import {
  IBskyFollowsService,
  BskyFollowedProfile,
} from '../../application/services/IBskyFollowsService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * Fake implementation for local mock mode. Pretends the caller follows the
 * other mock Bluesky accounts, then intersects with actual Semble users so
 * recommendations behave realistically against local data.
 */
export class FakeBskyFollowsService implements IBskyFollowsService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getSembleUsersFollowedOnBsky(
    callerDid: string,
    _maxFollows?: number,
  ): Promise<Result<Map<string, BskyFollowedProfile>>> {
    try {
      // Candidate mock accounts the caller "follows" on Bluesky (excluding self)
      const candidates = this.getMockFollowedProfiles().filter(
        (p) => p.did !== callerDid,
      );

      // Intersect with real Semble users so results reflect local data
      const existingResult = await this.userRepository.findExistingDIDs(
        candidates.map((p) => p.did),
      );
      if (existingResult.isErr()) {
        return err(
          new Error(
            `Failed to look up Semble users: ${existingResult.error.message}`,
          ),
        );
      }

      const existing = new Set(existingResult.value);
      const followed = new Map<string, BskyFollowedProfile>();
      candidates.forEach((p) => {
        if (existing.has(p.did)) {
          followed.set(p.did, p);
        }
      });

      return ok(followed);
    } catch (error) {
      return err(
        new Error(
          `Failed to get mock Bluesky follows: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private getMockFollowedProfiles(): BskyFollowedProfile[] {
    const avatarUrl =
      'https://cdn.bsky.app/img/avatar/plain/did:plc:rlknsba2qldjkicxsmni3vyn/bafkreid4nmxspygkftep5b3m2wlcm3xvnwefkswzej7dhipojjxylkzfby@jpeg';

    return [
      {
        did: process.env.BSKY_DID_1 || 'did:plc:mock123',
        handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
        displayName: 'Mock User Alice',
        avatarUrl,
        description:
          'This is Alice - a mock profile for testing purposes (https://semble.so/), made by @cosmik.network.',
      },
      {
        did: process.env.BSKY_DID_2 || 'did:plc:mock456',
        handle: process.env.BSKY_HANDLE_2 || 'bob.bsky.social',
        displayName: 'Mock User Bob',
        avatarUrl,
        description:
          'This is Bob - a second mock profile for testing purposes (https://semble.so/), made by @cosmik.network.',
      },
    ];
  }
}
