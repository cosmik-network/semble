import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { IProfileService } from '../../../domain/services/IProfileService';
import { PaginationDTO, CardSortingDTO } from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { ValidationError } from './GetAnnotationsForUrlUseCase';

export interface GetNotesForAnnotationQuery {
  url: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

export interface NoteForAnnotationDTO {
  id: string;
  note: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetNotesForAnnotationResult {
  notes: NoteForAnnotationDTO[];
  pagination: PaginationDTO;
  sorting: CardSortingDTO;
}

export class GetNotesForAnnotationUseCase implements UseCase<
  GetNotesForAnnotationQuery,
  Result<GetNotesForAnnotationResult>
> {
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetNotesForAnnotationQuery,
  ): Promise<Result<GetNotesForAnnotationResult>> {
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    // Matching key — same normalization the write path stores
    const exactNormalized = normalizeQuotedText(query.exact ?? '');
    if (exactNormalized.length === 0) {
      return err(new ValidationError('exact text is required'));
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      const result = await this.cardQueryRepo.getNotesForAnnotation(
        urlResult.value.value,
        exactNormalized,
        {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      );

      // Enrich with author profiles using ProfileEnricher
      const uniqueAuthorIds = Array.from(
        new Set(result.items.map((item) => item.authorId)),
      );

      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueAuthorIds,
        query.callingUserId,
        {
          skipFailures: true, // Skip profiles that fail to resolve
          mapToUser: false, // Use inline profile (without isFollowing)
        },
      );

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch author profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

      // Filter out notes with missing author profiles
      const enrichedNotes = result.items
        .map((item) => {
          const author = profileMap.get(item.authorId);
          if (!author) {
            return null;
          }
          return {
            id: item.id,
            note: item.note,
            author,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          } satisfies NoteForAnnotationDTO;
        })
        .filter((note) => note !== null);

      return ok({
        notes: enrichedNotes,
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
          `Failed to retrieve notes for annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
