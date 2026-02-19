import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
  WithCollections,
  UrlCardView,
} from '../../../domain/ICardQueryRepository';
import { UrlType } from '../../../domain/value-objects/UrlType';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { IProfileService } from '../../../domain/services/IProfileService';
import { User } from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';

export interface GetUrlCardsQuery {
  userId: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
}

// Enriched data for the final use case result
export type UrlCardListItemDTO = Omit<UrlCardView, 'authorId'> & {
  author: User;
};
export interface GetUrlCardsResult {
  cards: UrlCardListItemDTO[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
  sorting: {
    sortBy: CardSortField;
    sortOrder: SortOrder;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetUrlCardsUseCase
  implements UseCase<GetUrlCardsQuery, Result<GetUrlCardsResult>>
{
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private identityResolver: IIdentityResolutionService,
    private profileService: IProfileService,
  ) {}

  async execute(query: GetUrlCardsQuery): Promise<Result<GetUrlCardsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const urlType = query.urlType;

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
      // Execute query to get raw card data using the resolved DID
      const result = await this.cardQueryRepo.getUrlCardsOfUser(
        didResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
          urlType,
        },
        query.callingUserId,
      );

      // Enrich cards with author profiles using ProfileEnricher utility
      const profileEnricher = new ProfileEnricher(this.profileService);
      const enrichResult = await profileEnricher.enrichWithAuthors(
        result.items,
        (item) => item.authorId,
        query.callingUserId,
        { mapToUser: false }, // Use inline profile (without isFollowing)
      );

      if (enrichResult.isErr()) {
        return err(enrichResult.error);
      }

      const enrichedCards = enrichResult.value;

      return ok({
        cards: enrichedCards,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.totalCount / limit),
          totalCount: result.totalCount,
          hasMore: page * limit < result.totalCount,
          limit,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve URL cards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
