import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { User } from '@semble/types';

export interface GetFollowingUsersQuery {
  userId: string; // DID or handle
  callingUserId?: string;
  page?: number;
  limit?: number;
}

export interface GetFollowingUsersResult {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetFollowingUsersUseCase
  implements UseCase<GetFollowingUsersQuery, Result<GetFollowingUsersResult>>
{
  constructor(
    private followsRepository: IFollowsRepository,
    private identityResolver: IIdentityResolutionService,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetFollowingUsersQuery,
  ): Promise<Result<GetFollowingUsersResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100

    // Parse and validate user identifier
    const identifierResult = DIDOrHandle.create(query.userId);
    if (identifierResult.isErr()) {
      return err(new ValidationError('Invalid user identifier'));
    }

    // Resolve to DID
    const didResult = await this.identityResolver.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new ValidationError(
          `Could not resolve user identifier: ${didResult.error.message}`,
        ),
      );
    }

    try {
      // Get paginated list of users that this user follows
      const followsResult = await this.followsRepository.getFollowing(
        didResult.value.value,
        FollowTargetType.USER,
        { page, limit },
      );

      if (followsResult.isErr()) {
        return err(
          new Error(
            `Failed to retrieve following users: ${followsResult.error instanceof Error ? followsResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      const { follows, totalCount } = followsResult.value;

      // Extract unique target IDs (the users being followed)
      const uniqueTargetIds = Array.from(
        new Set(follows.map((follow) => follow.targetId)),
      );

      // Fetch profiles for all followed users
      const profilePromises = uniqueTargetIds.map((targetId) =>
        this.profileService.getProfile(targetId, query.callingUserId),
      );

      const profileResults = await Promise.all(profilePromises);

      // Create a map of profiles
      const profileMap = new Map<string, User>();

      for (let i = 0; i < uniqueTargetIds.length; i++) {
        const profileResult = profileResults[i];
        const targetId = uniqueTargetIds[i];
        if (!profileResult || !targetId) {
          return err(new Error('Missing profile result or target ID'));
        }
        if (profileResult.isErr()) {
          return err(
            new Error(
              `Failed to fetch user profile: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
            ),
          );
        }
        const profile = profileResult.value;
        profileMap.set(targetId, {
          id: profile.id,
          name: profile.name,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
          bannerUrl: profile.bannerUrl,
          description: profile.bio,
          isFollowing: profile.isFollowing,
        });
      }

      // Build users array in the order of follows (chronological)
      const users: User[] = follows
        .map((follow) => profileMap.get(follow.targetId))
        .filter((user): user is User => user !== undefined);

      return ok({
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: page * limit < totalCount,
          limit,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve following users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
