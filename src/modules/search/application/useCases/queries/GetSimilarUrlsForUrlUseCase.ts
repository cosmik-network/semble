import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { URL } from '../../../../cards/domain/value-objects/URL';
import {
  SearchService,
  CardViewSearchResult,
} from '../../../domain/services/SearchService';
import {
  GetSimilarUrlsForUrlParams,
  CardSearchResultView,
  Pagination,
} from '@semble/types';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';
import { CardTypeEnum } from '../../../../cards/domain/value-objects/CardType';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import { ProfileEnricher } from '../../../../cards/application/services/ProfileEnricher';
import { toAnnotationSearchResultDTO } from '../../services/AnnotationSearchResultDto';

export interface GetSimilarUrlsForUrlQuery extends GetSimilarUrlsForUrlParams {
  callingUserId?: string;
}

export interface GetSimilarUrlsForUrlResult {
  results: CardSearchResultView[];
  pagination: Pagination;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetSimilarUrlsForUrlUseCase implements UseCase<
  GetSimilarUrlsForUrlQuery,
  Result<GetSimilarUrlsForUrlResult, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private searchService: SearchService,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetSimilarUrlsForUrlQuery,
  ): Promise<
    Result<
      GetSimilarUrlsForUrlResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Set defaults
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100); // Cap at 100
      const threshold = query.threshold || 0.3;

      // Validate URL
      const urlResult = URL.create(query.url);
      if (urlResult.isErr()) {
        return err(
          new ValidationError(`Invalid URL: ${urlResult.error.message}`),
        );
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

      // Always get 50 results from vector database
      const vectorDbLimit = 50;
      const similarCardsResult = await this.searchService.findSimilarCards(
        urlResult.value,
        {
          limit: vectorDbLimit,
          threshold,
          urlType,
          cardType,
          callingUserId: query.callingUserId,
        },
      );

      // If search fails, return empty results instead of erroring
      const allResults = similarCardsResult.isOk()
        ? similarCardsResult.value
        : [];
      const totalAvailable = allResults.length; // This is max 50

      // Hydrate annotation authors before mapping to the wire shape;
      // annotation hits whose author can't be resolved are dropped
      const mappedResults = await this.mapToWireResults(
        allResults,
        query.callingUserId,
      );

      // Apply pagination to the 50 results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = mappedResults.slice(startIndex, endIndex);

      // Calculate pagination info based on the 50 results we have
      const totalPages = Math.ceil(totalAvailable / limit);
      const hasMore = endIndex < totalAvailable;

      return ok({
        results: paginatedResults,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalAvailable, // This will be max 50
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
