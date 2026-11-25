import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  AnnotationCardView,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { IProfileService } from '../../../domain/services/IProfileService';
import {
  ICollectionQueryRepository,
  CollectionSortField,
} from '../../../domain/ICollectionQueryRepository';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { User } from '@semble/types';
import { ValidationError } from './GetAnnotationsForUrlUseCase';

export interface GetAnnotationQuery {
  url: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact: string;
  callingUserId?: string;
}

// Enriched annotation view — same shape as the annotation variant of
// GetAnnotationsForUrlUseCase's list items
export type AnnotationViewDTO = Omit<AnnotationCardView, 'authorId'> & {
  author: User;
};

export interface GetAnnotationResult {
  annotation?: AnnotationViewDTO;
  /** Collections containing any passage-matching card */
  collectionCount?: number;
  /** Note-bearing cards matching the passage */
  noteCount?: number;
}

export class GetAnnotationUseCase implements UseCase<
  GetAnnotationQuery,
  Result<GetAnnotationResult, ValidationError | Error>
> {
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetAnnotationQuery,
  ): Promise<Result<GetAnnotationResult, ValidationError | Error>> {
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

    try {
      // Tab counts and the passage's representative view are independent —
      // limit 1 reads, the totals are what matter
      const [cardIds, notes] = await Promise.all([
        this.cardQueryRepo.getMatchingAnnotationCardIds(
          urlResult.value.value,
          exactNormalized,
        ),
        this.cardQueryRepo.getNotesForAnnotation(
          urlResult.value.value,
          exactNormalized,
          {
            page: 1,
            limit: 1,
            sortBy: CardSortField.UPDATED_AT,
            sortOrder: SortOrder.DESC,
          },
        ),
      ]);

      const collectionCount = cardIds.length
        ? (
            await this.collectionQueryRepo.getCollectionsContainingCards(
              cardIds,
              {
                page: 1,
                limit: 1,
                sortBy: CollectionSortField.UPDATED_AT,
                sortOrder: SortOrder.DESC,
              },
            )
          ).totalCount
        : 0;

      if (cardIds.length === 0) {
        return ok({ collectionCount, noteCount: notes.totalCount });
      }

      const views =
        await this.cardQueryRepo.getBatchAnnotationCardViews(cardIds);
      const representative = [...views.values()].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      )[0];
      if (!representative) {
        return ok({ collectionCount, noteCount: notes.totalCount });
      }

      const profileEnricher = new ProfileEnricher(this.profileService);
      const enrichResult = await profileEnricher.enrichWithAuthors(
        [representative],
        (item) => item.authorId,
        query.callingUserId,
        { mapToUser: false }, // Use inline profile (without isFollowing)
      );
      if (enrichResult.isErr()) {
        return err(enrichResult.error);
      }

      return ok({
        annotation: enrichResult.value[0],
        collectionCount,
        noteCount: notes.totalCount,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
