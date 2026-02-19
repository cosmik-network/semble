import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { User } from '@semble/types';

export interface GetFollowersQuery {
  userId: string; // DID or handle
  callingUserId?: string;
  page?: number;
  limit?: number;
}

export interface GetFollowersResult {
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

export class GetFollowersUseCase
  implements UseCase<GetFollowersQuery, Result<GetFollowersResult>>
{
  constructor(
    private followsRepository: IFollowsRepository,
    private identityResolver: IIdentityResolutionService,
    private profileService: IProfileService,
  ) {}

  async execute(query: GetFollowersQuery): Promise<Result<GetFollowersResult>> {
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
      // Get all followers (not paginated at repo level yet)
      const followersResult = await this.followsRepository.getFollowers(
        didResult.value.value,
        FollowTargetType.USER,
      );

      if (followersResult.isErr()) {
        return err(
          new Error(
            `Failed to retrieve followers: ${followersResult.error instanceof Error ? followersResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      const allFollows = followersResult.value;
      const totalCount = allFollows.length;

      // Apply pagination manually
      const offset = (page - 1) * limit;
      const paginatedFollows = allFollows.slice(offset, offset + limit);

      // Extract unique follower IDs
      const uniqueFollowerIds = Array.from(
        new Set(paginatedFollows.map((follow) => follow.followerId.value)),
      );

      // Fetch profiles for all followers
      const profilePromises = uniqueFollowerIds.map((followerId) =>
        this.profileService.getProfile(followerId, query.callingUserId),
      );

      const profileResults = await Promise.all(profilePromises);

      // Create a map of profiles
      const profileMap = new Map<string, User>();

      for (let i = 0; i < uniqueFollowerIds.length; i++) {
        const profileResult = profileResults[i];
        const followerId = uniqueFollowerIds[i];
        if (!profileResult || !followerId) {
          return err(new Error('Missing profile result or follower ID'));
        }
        if (profileResult.isErr()) {
          return err(
            new Error(
              `Failed to fetch user profile: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
            ),
          );
        }
        const profile = profileResult.value;
        profileMap.set(followerId, {
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
      const users: User[] = paginatedFollows
        .map((follow) => profileMap.get(follow.followerId.value))
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
          `Failed to retrieve followers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
