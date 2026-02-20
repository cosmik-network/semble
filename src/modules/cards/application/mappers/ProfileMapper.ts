import { UserProfile } from '../../domain/services/IProfileService';
import { User } from '@semble/types';

/**
 * ProfileMapper - Centralizes mapping from domain UserProfile to API User DTOs
 *
 * This eliminates the repetitive bio → description mapping across all use cases
 */
export class ProfileMapper {
  /**
   * Maps a UserProfile (domain model) to a User (API DTO)
   * Handles the bio → description field name conversion
   */
  static toUser(profile: UserProfile): User {
    return {
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      description: profile.bio,
      isFollowing: profile.isFollowing,
      followsYou: profile.followsYou,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      followedCollectionsCount: profile.followedCollectionsCount,
    };
  }

  /**
   * Maps a UserProfile to an inline profile object (without isFollowing)
   * Used for nested author objects in collections, cards, etc.
   */
  static toInlineProfile(profile: UserProfile): {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    bannerUrl?: string;
    description?: string;
    followsYou?: boolean;
    followerCount?: number;
    followingCount?: number;
    followedCollectionsCount?: number;
  } {
    return {
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      description: profile.bio,
      followsYou: profile.followsYou,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      followedCollectionsCount: profile.followedCollectionsCount,
    };
  }

  /**
   * Maps a UserProfile to a minimal profile object (for card authors in collection pages)
   * Only includes essential display fields
   */
  static toMinimalProfile(profile: UserProfile): {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    bannerUrl?: string;
  } {
    return {
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
    };
  }

  /**
   * Creates a fallback profile for when profile fetch fails
   * Used in feed use cases that need graceful degradation
   */
  static createFallbackProfile(userId: string): {
    id: string;
    name: string;
    handle: string;
  } {
    return {
      id: userId,
      name: 'Unknown User',
      handle: userId,
    };
  }
}
