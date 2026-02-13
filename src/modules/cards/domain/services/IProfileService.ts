import { Result } from 'src/shared/core/Result';

export interface IProfileService {
  getProfile(userId: string, callerId?: string): Promise<Result<UserProfile>>;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing?: boolean;
}
