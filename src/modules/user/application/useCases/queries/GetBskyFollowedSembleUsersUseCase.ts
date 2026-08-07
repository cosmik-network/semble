import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { User } from '@semble/types';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { IBskyFollowsService } from '../../services/IBskyFollowsService';

export interface GetBskyFollowedSembleUsersQuery {
  callingUserId: string;
  page?: number;
  limit?: number;
}

export interface GetBskyFollowedSembleUsersResult {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Paginated list of Semble users that the calling user follows on Bluesky
 * but does not yet follow on Semble.
 */
export class GetBskyFollowedSembleUsersUseCase implements UseCase<
  GetBskyFollowedSembleUsersQuery,
  Result<
    GetBskyFollowedSembleUsersResult,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private bskyFollowsService: IBskyFollowsService,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: GetBskyFollowedSembleUsersQuery,
  ): Promise<
    Result<
      GetBskyFollowedSembleUsersResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      if (!query.callingUserId) {
        return err(new ValidationError('Calling user is required'));
      }

      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);

      const followedResult =
        await this.bskyFollowsService.getSembleUsersFollowedOnBsky(
          query.callingUserId,
        );
      if (followedResult.isErr()) {
        return err(AppError.UnexpectedError.create(followedResult.error));
      }

      const candidates = Array.from(followedResult.value.values()).filter(
        (profile) => profile.did !== query.callingUserId,
      );

      // Drop users already followed on Semble (filter before paginating so
      // pages and totalCount only reflect not-yet-followed users)
      const followingResult =
        await this.followsRepository.checkFollowingMultiple(
          query.callingUserId,
          candidates.map((p) => p.did),
          FollowTargetType.USER,
        );
      if (followingResult.isErr()) {
        return err(AppError.UnexpectedError.create(followingResult.error));
      }
      const followingMap = followingResult.value;

      const profiles = candidates.filter(
        (profile) => !followingMap.get(profile.did),
      );

      // Stable order across pages (getFollows returns them in follow order,
      // but the map intersection does not guarantee it)
      profiles.sort((a, b) => a.handle.localeCompare(b.handle));

      const totalCount = profiles.length;
      const offset = (page - 1) * limit;
      const pageProfiles = profiles.slice(offset, offset + limit);

      const users: User[] = pageProfiles.map((profile) => ({
        id: profile.did,
        name: profile.displayName || profile.handle,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        description: profile.description,
        isFollowing: false,
      }));

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
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
