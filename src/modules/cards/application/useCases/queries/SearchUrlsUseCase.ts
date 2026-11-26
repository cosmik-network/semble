import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import {
  UrlView,
  UrlMetadata,
  PaginationDTO,
  CardSearchResultView,
} from '@semble/types';
import { UrlType } from '../../../domain/value-objects/UrlType';
import { DID } from '../../../../atproto/domain/DID';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { IProfileService } from '../../../domain/services/IProfileService';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { toAnnotationSearchResultDTO } from '../../../../search/application/services/AnnotationSearchResultDto';

export interface SearchUrlsQuery {
  searchQuery: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
  authorDid?: DID;
  collectionId?: CollectionId;
  /** ALL (default, blended), URL, or ANNOTATION */
  cardType?: 'URL' | 'ANNOTATION' | 'ALL';
}

export interface SearchUrlsResult {
  results: CardSearchResultView[];
  pagination: PaginationDTO;
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

export class SearchUrlsUseCase implements UseCase<
  SearchUrlsQuery,
  Result<SearchUrlsResult>
> {
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(query: SearchUrlsQuery): Promise<Result<SearchUrlsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const cardType = query.cardType || 'ALL';

    // Validate urlType if provided
    if (query.urlType && !Object.values(UrlType).includes(query.urlType)) {
      return err(new ValidationError(`Invalid URL type: ${query.urlType}`));
    }

    try {
      // URL search (also the URL half of blended ALL mode)
      const urlSearch =
        cardType !== 'ANNOTATION'
          ? await this.cardQueryRepo.searchUrls({
              searchQuery: query.searchQuery?.trim() || '',
              page,
              limit,
              sortBy,
              sortOrder,
              urlType: query.urlType,
              authorDid: query.authorDid,
              collectionId: query.collectionId,
            })
          : null;

      // Annotation search (also the annotation half of blended ALL mode)
      const annotationSearch =
        cardType !== 'URL'
          ? await this.cardQueryRepo.searchAnnotations({
              searchQuery: query.searchQuery?.trim() || '',
              page,
              limit,
              sortBy,
              sortOrder,
              urlType: query.urlType,
              authorDid: query.authorDid,
            })
          : null;

      // Map URL results to UrlViews with library context, keeping the
      // representative card's sort timestamp for blended merging
      const urlEntries: { view: UrlView; updatedAt: Date }[] = [];
      if (urlSearch) {
        const urls = urlSearch.items.map((item) => item.url);
        const urlLibraryInfoMap =
          await this.cardQueryRepo.getBatchUrlLibraryInfo(
            urls,
            query.callingUserId,
          );

        for (const item of urlSearch.items) {
          const urlInfo = urlLibraryInfoMap.get(item.url);
          if (!urlInfo) {
            continue; // Skip URLs where we couldn't fetch info
          }

          const metadata: UrlMetadata = item.contentData.metadata;

          urlEntries.push({
            view: {
              url: item.url,
              metadata,
              urlLibraryCount: urlInfo.urlLibraryCount,
              urlInLibrary: urlInfo.urlInLibrary,
              urlConnectionCount: urlInfo.urlConnectionCount,
              urlIsConnected: urlInfo.urlIsConnected,
            },
            updatedAt: item.updatedAt,
          });
        }
      }

      // Map annotation results to wire views with author profiles
      const annotationViews = annotationSearch
        ? await this.enrichAnnotationViews(
            annotationSearch.items,
            query.callingUserId,
          )
        : [];

      // Merge: single-type modes pass through; blended ALL merge-sorts the
      // two pages by the shared sort key (approximate beyond the first page —
      // each source is offset-windowed independently)
      const merged = this.mergeResults(
        urlEntries,
        annotationViews,
        sortBy,
        sortOrder,
        cardType,
      );

      const totalCount =
        (urlSearch?.totalCount ?? 0) + (annotationSearch?.totalCount ?? 0);

      return ok({
        results: merged.slice(0, limit),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: page * limit < totalCount,
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
          `Failed to search URLs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private async enrichAnnotationViews(
    views: Awaited<
      ReturnType<ICardQueryRepository['searchAnnotations']>
    >['items'],
    callingUserId?: string,
  ) {
    if (views.length === 0) {
      return [];
    }

    const profileEnricher = new ProfileEnricher(this.profileService);
    const authorProfilesResult = await profileEnricher.buildProfileMap(
      [...new Set(views.map((view) => view.authorId))],
      callingUserId,
      {
        skipFailures: true, // Skip annotations with failed author profiles
        mapToUser: false, // Use inline profile (without isFollowing)
      },
    );
    const authorProfiles = authorProfilesResult.isOk()
      ? authorProfilesResult.value
      : new Map<string, never>();

    return views.flatMap((view) => {
      const author = authorProfiles.get(view.authorId);
      if (!author) {
        return []; // Skip annotations with missing author profiles
      }
      return [toAnnotationSearchResultDTO(view, author, 0)];
    });
  }

  /**
   * Merge URL and annotation results. Single-type modes pass through
   * unchanged; blended mode merge-sorts by the shared sort key (URL entries
   * by their representative card's timestamp, annotations by their card's
   * timestamp; LIBRARY_COUNT compares URL-level vs entity-level counts).
   */
  private mergeResults(
    urlEntries: { view: UrlView; updatedAt: Date }[],
    annotationViews: CardSearchResultView[],
    sortBy: CardSortField,
    sortOrder: SortOrder,
    cardType: 'URL' | 'ANNOTATION' | 'ALL',
  ): CardSearchResultView[] {
    if (cardType === 'URL') {
      return urlEntries.map((entry) => ({
        cardType: 'URL' as const,
        ...entry.view,
      }));
    }
    if (cardType === 'ANNOTATION') {
      return annotationViews;
    }

    const order = sortOrder === SortOrder.ASC ? 1 : -1;
    return [
      ...urlEntries.map((entry) => ({
        result: { cardType: 'URL' as const, ...entry.view },
        key:
          sortBy === CardSortField.LIBRARY_COUNT
            ? entry.view.urlLibraryCount
            : entry.updatedAt.getTime(),
      })),
      ...annotationViews.map((result) => ({
        result,
        key:
          result.cardType === 'ANNOTATION'
            ? sortBy === CardSortField.LIBRARY_COUNT
              ? result.libraryCount
              : Date.parse(result.updatedAt)
            : 0,
      })),
    ]
      .sort((a, b) => (a.key - b.key) * order)
      .map((entry) => entry.result);
  }
}
