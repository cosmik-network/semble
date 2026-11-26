import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import {
  SearchService,
  CardViewSearchResult,
} from '../../../domain/services/SearchService';
import {
  SemanticSearchUrlsParams,
  CardSearchResultView,
  Pagination,
} from '@semble/types';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';
import { CardTypeEnum } from '../../../../cards/domain/value-objects/CardType';
import { IIdentityResolutionService } from '../../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../../atproto/domain/DIDOrHandle';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import { ProfileEnricher } from '../../../../cards/application/services/ProfileEnricher';
import { toAnnotationSearchResultDTO } from '../../services/AnnotationSearchResultDto';

export interface SemanticSearchUrlsQuery extends SemanticSearchUrlsParams {
  callingUserId?: string;
  filterByIdentifier?: string;
}

export interface SemanticSearchUrlsResult {
  results: CardSearchResultView[];
  pagination: Pagination;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class SemanticSearchUrlsUseCase implements UseCase<
  SemanticSearchUrlsQuery,
  Result<SemanticSearchUrlsResult, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private searchService: SearchService,
    private identityResolutionService: IIdentityResolutionService,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: SemanticSearchUrlsQuery,
  ): Promise<
    Result<SemanticSearchUrlsResult, ValidationError | AppError.UnexpectedError>
  > {
    try {
      // Set defaults
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100); // Cap at 100
      const threshold = query.threshold || 0.3;

      // Validate query
      if (!query.query || query.query.trim().length === 0) {
        return err(new ValidationError('Query parameter is required'));
      }

      // Parse urlType if provided
      let urlType: UrlType | undefined;
      if (query.urlType) {
        // Validate that the urlType is a valid enum value
        if (Object.values(UrlType).includes(query.urlType as UrlType)) {
          urlType = query.urlType as UrlType;
        } else {
          return err(new ValidationError(`Invalid URL type: ${query.urlType}`));
        }
      }

      // cardType routes the vector query to the URL index, the annotation
      // namespace, or both
      const cardType = query.cardType as CardTypeEnum | undefined;

      // Resolve identifier to DID if provided
      let filterByUserId: string | undefined;
      if (query.filterByIdentifier) {
        const identifierResult = DIDOrHandle.create(query.filterByIdentifier);
        if (identifierResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid identifier: ${identifierResult.error.message}`,
            ),
          );
        }

        const didResult = await this.identityResolutionService.resolveToDID(
          identifierResult.value,
        );
        if (didResult.isErr()) {
          return err(
            new ValidationError(
              `Failed to resolve identifier to DID: ${didResult.error.message}`,
            ),
          );
        }

        filterByUserId = didResult.value.value;
      }

      // Get more results if filtering by user to account for filtering
      const vectorDbLimit = filterByUserId ? 100 : 50;
      const searchResult = await this.searchService.semanticSearchCards(
        query.query.trim(),
        {
          limit: vectorDbLimit,
          threshold,
          urlType,
          cardType,
          callingUserId: query.callingUserId,
          filterByUserId,
        },
      );

      if (searchResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to search URLs: ${searchResult.error.message}`,
          ),
        );
      }

      const allResults = searchResult.value;
      const totalAvailable = allResults.length; // This is max 100

      // Hydrate annotation authors before mapping to the wire shape;
      // annotation hits whose author can't be resolved are dropped
      const mappedResults = await this.mapToWireResults(
        allResults,
        query.callingUserId,
      );

      // Apply pagination to the vector-db-sized result pool
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = mappedResults.slice(startIndex, endIndex);

      // Calculate pagination info based on the pool we have
      const totalPages = Math.ceil(totalAvailable / limit);
      const hasMore = endIndex < totalAvailable;

      return ok({
        results: paginatedResults,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalAvailable, // This will be max 100
          hasMore,
          limit,
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async mapToWireResults(
    results: CardViewSearchResult[],
    callingUserId?: string,
  ): Promise<CardSearchResultView[]> {
    // Collect annotation author ids for profile enrichment
    const annotationAuthorIds = [
      ...new Set(
        results
          .filter((result) => result.cardType === CardTypeEnum.ANNOTATION)
          .map((result) => result.view.authorId),
      ),
    ];

    const profileEnricher = new ProfileEnricher(this.profileService);
    const authorProfilesResult = await profileEnricher.buildProfileMap(
      annotationAuthorIds,
      callingUserId,
      {
        skipFailures: true, // Skip annotations with failed author profiles
        mapToUser: false, // Use inline profile (without isFollowing)
      },
    );
    // buildProfileMap failures just mean empty/sparse results — fall back
    // to an empty map so annotation hits get dropped rather than erroring
    const authorProfiles = authorProfilesResult.isOk()
      ? authorProfilesResult.value
      : new Map<string, never>();

    const mapped: CardSearchResultView[] = [];
    for (const result of results) {
      if (result.cardType === CardTypeEnum.URL) {
        mapped.push({
          cardType: 'URL',
          ...result.view,
        });
      } else {
        const author = authorProfiles.get(result.view.authorId);
        if (!author) {
          continue; // Skip annotations with missing author profiles
        }
        mapped.push(
          toAnnotationSearchResultDTO(result.view, author, result.similarity),
        );
      }
    }
    return mapped;
  }
}
