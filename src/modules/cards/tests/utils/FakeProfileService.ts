import {
  IProfileService,
  UserProfile,
} from '../../domain/services/IProfileService';
import { Result, ok, err } from '../../../../shared/core/Result';

export class FakeProfileService implements IProfileService {
  private profiles: Map<string, UserProfile> = new Map();
  private shouldFail: boolean = false;

  async getProfile(userId: string): Promise<Result<UserProfile>> {
    if (this.shouldFail) {
      return err(new Error('Simulated profile service failure'));
    }

    const profile = this.profiles.get(userId);
    if (!profile) {
      return err(new Error(`Profile not found for user: ${userId}`));
    }

    return ok(profile);
  }

  async invalidateCounts(userId: string): Promise<void> {
    // No-op for fake implementation
    // In real implementation, this would invalidate the cache
  }

  // Test helper methods
  addProfile(profile: UserProfile): void {
    this.profiles.set(profile.id, profile);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.profiles.clear();
    this.shouldFail = false;
  }

  getStoredProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }
}
