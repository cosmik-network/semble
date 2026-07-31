import { Result } from 'src/shared/core/Result';

// Profile data already returned by getFollows — lets callers skip profile fetches
export interface BskyFollowedProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  description?: string;
}

/**
 * Resolves which of the accounts a user follows on Bluesky are Semble users.
 */
export interface IBskyFollowsService {
  /**
   * Get the Semble users that the caller follows on Bluesky, keyed by DID,
   * with the profile data included in the getFollows response.
   */
  getSembleUsersFollowedOnBsky(
    callerDid: string,
    maxFollows?: number,
  ): Promise<Result<Map<string, BskyFollowedProfile>>>;
}
