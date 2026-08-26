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
   * Get the Semble users that `actorDid` follows on Bluesky, keyed by DID,
   * with the profile data included in the getFollows response.
   *
   * `viewerDid` is only used to pick which authenticated agent makes the
   * request; it doesn't change the result, since follows are public. Omit it
   * (or pass the same DID) when the viewer is reading their own follows.
   */
  getSembleUsersFollowedOnBsky(
    actorDid: string,
    maxFollows?: number,
    viewerDid?: string,
  ): Promise<Result<Map<string, BskyFollowedProfile>>>;
}
