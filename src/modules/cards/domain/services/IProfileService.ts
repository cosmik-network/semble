import { Result } from 'src/shared/core/Result';

export interface IProfileService {
  getProfile(userId: string, callerId?: string): Promise<Result<UserProfile>>;
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
  urlCardCount?: number;
  collectionCount?: number;
  connectionCount?: number;
  connectionsByType?: { total: number; [type: string]: number };
}
