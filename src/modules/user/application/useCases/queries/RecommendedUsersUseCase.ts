import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { User } from '@semble/types';
import {
  ICardQueryRepository,
  UserActivityStats,
} from 'src/modules/cards/domain/ICardQueryRepository';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ProfileEnricher } from 'src/modules/cards/application/services/ProfileEnricher';
import {
  BskyFollowsService,
  BskyFollowedProfile,
} from '../../services/BskyFollowsService';

export interface RecommendedUsersRankingConfig {
  cardWeight: number;
  collectionWeight: number;
  connectionWeight: number;
  followerWeight: number;
  // Max score contribution for activity recency; decays exponentially with age
  recencyWeight: number;
  recencyHalfLifeDays: number;
  // Flat bonus when the calling user follows the candidate on Bluesky
  bskyFollowWeight: number;
}

export const DEFAULT_USER_RANKING_CONFIG: RecommendedUsersRankingConfig = {
  cardWeight: 1,
  collectionWeight: 2,
  connectionWeight: 2,
  followerWeight: 3,
  recencyWeight: 20,
  recencyHalfLifeDays: 14,
  bskyFollowWeight: 30,
};

const MAX_RESULTS = 40;

export interface RecommendedUsersQuery {
  urls: string[];
  callingUserId: string;
}

export type RecommendedUser = User & { followsOnBsky: boolean };

export interface RecommendedUsersResult {
  users: RecommendedUser[];
  bskyFollowedSembleUserCount: number;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class RecommendedUsersUseCase implements UseCase<
  RecommendedUsersQuery,
  Result<RecommendedUsersResult, ValidationError | AppError.UnexpectedError>
> {
  private config: RecommendedUsersRankingConfig;

  constructor(
    private cardQueryRepository: ICardQueryRepository,
    private followsRepository: IFollowsRepository,
    private bskyFollowsService: BskyFollowsService,
    private profileService: IProfileService,
    config?: Partial<RecommendedUsersRankingConfig>,
  ) {
    this.config = { ...DEFAULT_USER_RANKING_CONFIG, ...config };
  }

  async execute(
    query: RecommendedUsersQuery,
  ): Promise<
    Result<RecommendedUsersResult, ValidationError | AppError.UnexpectedError>
  > {
    try {
      const urls = (query.urls || []).filter((u) => u.trim().length > 0);
      if (urls.length === 0) {
        return err(new ValidationError('At least one URL is required'));
      }
      if (!query.callingUserId) {
        return err(new ValidationError('Calling user is required'));
      }

      // 1. In parallel: users who engaged with the URLs + Semble users followed on Bluesky
      const [urlUserIds, bskyFollowedResult] = await Promise.all([
        this.cardQueryRepository.getUsersForUrls(urls),
        this.bskyFollowsService.getSembleUsersFollowedOnBsky(
          query.callingUserId,
        ),
      ]);

      // Best-effort: recommendations still work if the Bluesky lookup fails
      let bskyFollowedProfiles = new Map<string, BskyFollowedProfile>();
      if (bskyFollowedResult.isOk()) {
        bskyFollowedProfiles = bskyFollowedResult.value;
      } else {
        console.warn(
          `RecommendedUsersUseCase: failed to fetch Bluesky follows: ${bskyFollowedResult.error.message}`,
        );
      }

      // 2. Combine and dedupe, excluding the calling user
      const candidateIds = Array.from(
        new Set([...urlUserIds, ...bskyFollowedProfiles.keys()]),
      ).filter((did) => did !== query.callingUserId);

      if (candidateIds.length === 0) {
        return ok({
          users: [],
          bskyFollowedSembleUserCount: bskyFollowedProfiles.size,
        });
      }

      // 3. Drop users the calling user already follows on Semble
      const followingResult =
        await this.followsRepository.checkFollowingMultiple(
          query.callingUserId,
          candidateIds,
          FollowTargetType.USER,
        );
      if (followingResult.isErr()) {
        return err(AppError.UnexpectedError.create(followingResult.error));
      }
      const followingMap = followingResult.value;
      const unfollowedIds = candidateIds.filter(
        (did) => !followingMap.get(did),
      );

      if (unfollowedIds.length === 0) {
        return ok({
          users: [],
          bskyFollowedSembleUserCount: bskyFollowedProfiles.size,
        });
      }

      // 4. Fetch ranking stats in parallel
      const [activityStatsMap, followerCountsResult] = await Promise.all([
        this.cardQueryRepository.getBatchUserActivityStats(unfollowedIds),
        this.followsRepository.getBatchFollowersCount(
          unfollowedIds,
          FollowTargetType.USER,
        ),
      ]);
      if (followerCountsResult.isErr()) {
        return err(AppError.UnexpectedError.create(followerCountsResult.error));
      }
      const followerCounts = followerCountsResult.value;

      // 5. Score, sort, take top N
      const ranked = unfollowedIds
        .map((did) => ({
          did,
          score: this.computeScore(
            activityStatsMap.get(did),
            followerCounts.get(did) || 0,
            bskyFollowedProfiles.has(did),
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS);

      // 6. Enrich with profiles. Bluesky-followed candidates already carry
      // profile data from getFollows, so only fetch the rest.
      const didsNeedingProfiles = ranked
        .map((r) => r.did)
        .filter((did) => !bskyFollowedProfiles.has(did));

      let profileMap = new Map<string, User>();
      if (didsNeedingProfiles.length > 0) {
        const profileEnricher = new ProfileEnricher(this.profileService);
        const profileMapResult = await profileEnricher.buildProfileMap(
          didsNeedingProfiles,
          query.callingUserId,
          {
            skipFailures: true,
            mapToUser: true,
          },
        );
        if (profileMapResult.isErr()) {
          return err(AppError.UnexpectedError.create(profileMapResult.error));
        }
        profileMap = profileMapResult.value;
      }

      const users: RecommendedUser[] = ranked
        .map(({ did }) => {
          const bskyProfile = bskyFollowedProfiles.get(did);
          if (bskyProfile) {
            return {
              id: bskyProfile.did,
              name: bskyProfile.displayName || bskyProfile.handle,
              handle: bskyProfile.handle,
              avatarUrl: bskyProfile.avatarUrl,
              description: bskyProfile.description,
              // Candidates the caller already follows on Semble were dropped above
              isFollowing: false,
              followsOnBsky: true,
            };
          }

          const profile = profileMap.get(did);
          if (!profile) return null;
          return {
            ...profile,
            followsOnBsky: false,
          };
        })
        .filter((user): user is RecommendedUser => user !== null);

      return ok({
        users,
        bskyFollowedSembleUserCount: bskyFollowedProfiles.size,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private computeScore(
    stats: UserActivityStats | undefined,
    followerCount: number,
    followsOnBsky: boolean,
  ): number {
    let score = this.config.followerWeight * followerCount;

    if (stats) {
      score +=
        this.config.cardWeight * stats.cardCount +
        this.config.collectionWeight * stats.collectionCount +
        this.config.connectionWeight * stats.connectionCount;

      if (stats.lastActivityAt) {
        const ageDays =
          (Date.now() - stats.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
        score +=
          this.config.recencyWeight *
          Math.pow(0.5, ageDays / this.config.recencyHalfLifeDays);
      }
    }

    if (followsOnBsky) {
      score += this.config.bskyFollowWeight;
    }

    return score;
  }
}
