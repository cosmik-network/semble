import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { IProfileService } from '../../../domain/services/IProfileService';
import { NoteCardDTO, PaginationDTO, CardSortingDTO } from '@semble/types';

export interface GetNoteCardsForUrlQuery {
  url: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

export interface GetNoteCardsForUrlResult {
  notes: NoteCardDTO[];
  pagination: PaginationDTO;
  sorting: CardSortingDTO;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetNoteCardsForUrlUseCase
  implements UseCase<GetNoteCardsForUrlQuery, Result<GetNoteCardsForUrlResult>>
{
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetNoteCardsForUrlQuery,
  ): Promise<Result<GetNoteCardsForUrlResult>> {
    // Validate URL
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      // Execute query to get note cards for the URL (raw data with authorId)
      const result = await this.cardQueryRepo.getNoteCardsForUrl(
        urlResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      );

      // Enrich with author profiles
      const uniqueAuthorIds = Array.from(
        new Set(result.items.map((item) => item.authorId)),
      );

      const profilePromises = uniqueAuthorIds.map((authorId) =>
        this.profileService.getProfile(authorId, query.callingUserId),
      );

      const profileResults = await Promise.all(profilePromises);

      // Create a map of profiles
      const profileMap = new Map<
        string,
        {
          id: string;
          name: string;
          handle: string;
          avatarUrl?: string;
          bannerUrl?: string;
          description?: string;
        }
      >();

      for (let i = 0; i < uniqueAuthorIds.length; i++) {
        const profileResult = profileResults[i];
        const authorId = uniqueAuthorIds[i];
        if (!profileResult || !authorId) {
          return err(new Error('Missing profile result or author ID'));
        }
        if (profileResult.isErr()) {
          return err(
            new Error(
              `Failed to fetch author profile: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
            ),
          );
        }
        const profile = profileResult.value;
        profileMap.set(authorId, {
          id: profile.id,
          name: profile.name,
          handle: profile.handle,
          avatarUrl: profile.avatarUrl,
          bannerUrl: profile.bannerUrl,
          description: profile.bio,
        });
      }

      // Map items with enriched author data
      const enrichedNotes: NoteCardDTO[] = result.items.map((item) => {
        const author = profileMap.get(item.authorId);
        if (!author) {
          throw new Error(`Profile not found for author ${item.authorId}`);
        }
        return {
          id: item.id,
          note: item.note,
          author,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        };
      });

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
          `Failed to retrieve note cards for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
