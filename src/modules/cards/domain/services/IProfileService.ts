import { Result } from 'src/shared/core/Result';

export interface IProfileService {
  getProfile(userId: string, callerId?: string): Promise<Result<UserProfile>>;
  invalidateCounts?(userId: string): Promise<void>;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  isFollowing?: boolean;
  followsYou?: boolean;
  followerCount?: number;
  followingCount?: number;
  followedCollectionsCount?: number;
}
