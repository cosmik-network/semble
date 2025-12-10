import {
  IProfileService,
  UserProfile,
} from 'src/modules/cards/domain/services/IProfileService';
import { Result, ok, err } from 'src/shared/core/Result';

export class FakeBlueskyProfileService implements IProfileService {
  async getProfile(userId: string): Promise<Result<UserProfile>> {
    try {
      // Determine which mock account to use based on userId (DID)
      const mockData = this.getMockDataForUserId(userId);

      const userProfile: UserProfile = {
        id: userId,
        name: mockData.name,
        handle: mockData.handle,
        avatarUrl: mockData.avatarUrl,
        bio: mockData.bio,
      };

      return ok(userProfile);
    } catch (error) {
      return err(
        new Error(
          `Error fetching mock profile: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  private getMockDataForUserId(userId: string): {
    name: string;
    handle: string;
    avatarUrl: string;
    bio: string;
  } {
    const did2 = process.env.BSKY_DID_2 || 'did:plc:mock456';

    if (userId === did2) {
      return {
        name: 'Mock User Bob',
        handle: process.env.BSKY_HANDLE_2 || 'bob.bsky.social',
        avatarUrl:
          'https://cdn.bsky.app/img/avatar/plain/did:plc:rlknsba2qldjkicxsmni3vyn/bafkreid4nmxspygkftep5b3m2wlcm3xvnwefkswzej7dhipojjxylkzfby@jpeg',
        bio: 'This is Bob - a second mock profile for testing purposes (https://semble.so/), made by @cosmik.network.',
      };
    }

    // Default to account 1
    return {
      name: 'Mock User Alice',
      handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
      avatarUrl:
        'https://cdn.bsky.app/img/avatar/plain/did:plc:rlknsba2qldjkicxsmni3vyn/bafkreid4nmxspygkftep5b3m2wlcm3xvnwefkswzej7dhipojjxylkzfby@jpeg',
      bio: 'This is Alice - a mock profile for testing purposes (https://semble.so/), made by @cosmik.network.',
    };
  }
}
