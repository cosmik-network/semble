import { UseCase } from 'src/shared/core/UseCase';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { err, ok, Result } from 'src/shared/core/Result';
import { UserProfileDTO } from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';

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

      // Fetch profiles for all users using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        userIds,
        undefined, // No calling user
        {
          skipFailures: true, // Skip failed profiles
          mapToUser: false, // Use inline profile (without isFollowing)
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

      // Convert map to array
      const users: UserProfileDTO[] = Array.from(profileMap.values());

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
