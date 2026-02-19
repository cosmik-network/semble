import { UseCase } from 'src/shared/core/UseCase';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { err, ok, Result } from 'src/shared/core/Result';
import { UserProfileDTO } from '@semble/types';

export interface GetLibrariesForCardQuery {
  cardId: string;
}

export interface GetLibrariesForCardResult {
  cardId: string;
  users: UserProfileDTO[];
  totalCount: number;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetLibrariesForCardUseCase
  implements
    UseCase<GetLibrariesForCardQuery, Result<GetLibrariesForCardResult>>
{
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetLibrariesForCardQuery,
  ): Promise<Result<GetLibrariesForCardResult>> {
    // Validate card ID
    if (!query.cardId || query.cardId.trim().length === 0) {
      return err(new ValidationError('Card ID is required'));
    }

    try {
      // Get user IDs who have this card in their library
      const userIds = await this.cardQueryRepo.getLibrariesForCard(
        query.cardId,
      );

      // Fetch profiles for all users
      const profilePromises = userIds.map((userId) =>
        this.profileService.getProfile(userId),
      );

      const profileResults = await Promise.all(profilePromises);

      // Filter out failed profile fetches and transform to DTOs
      const users: UserProfileDTO[] = [];
      const errors: string[] = [];

      for (let i = 0; i < profileResults.length; i++) {
        const result = profileResults[i];
        if (!result) {
          errors.push(`No profile found for user ${userIds[i]}`);
          continue;
        }
        if (result.isOk()) {
          const profile = result.value;
          users.push({
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            bannerUrl: profile.bannerUrl,
            description: profile.bio,
          });
        } else {
          errors.push(
            `Failed to fetch profile for user ${userIds[i]}: ${result.error.message}`,
          );
        }
      }

      // Log errors but don't fail the entire operation
      if (errors.length > 0) {
        console.warn('Some profile fetches failed:', errors);
      }

      return ok({
        cardId: query.cardId,
        users,
        totalCount: users.length,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to get libraries for card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
