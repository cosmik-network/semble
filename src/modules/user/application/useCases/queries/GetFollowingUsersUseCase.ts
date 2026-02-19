import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { User } from '@semble/types';
import { ProfileEnricher } from 'src/modules/cards/application/services/ProfileEnricher';

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

      // Fetch profiles for all followed users using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueTargetIds,
        query.callingUserId,
        {
          skipFailures: false, // Fail if any profile fetch fails (preserving original behavior)
          mapToUser: true, // Use full User DTO with isFollowing
        },
      );

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch user profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

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
