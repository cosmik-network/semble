import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  AnnotationCardView,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { IProfileService } from '../../../domain/services/IProfileService';
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
}

export class GetAnnotationUseCase implements UseCase<
  GetAnnotationQuery,
  Result<GetAnnotationResult, ValidationError | Error>
> {
  constructor(
    private cardQueryRepo: ICardQueryRepository,
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
      // Every card matching the passage, then the passage's representative
      // view — the most recently updated matching card, carrying the
      // entity-level engagement counts
      const cardIds = await this.cardQueryRepo.getMatchingAnnotationCardIds(
        urlResult.value.value,
        exactNormalized,
      );
      if (cardIds.length === 0) {
        return ok({});
      }

      const views =
        await this.cardQueryRepo.getBatchAnnotationCardViews(cardIds);
      const representative = [...views.values()].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      )[0];
      if (!representative) {
        return ok({});
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

      return ok({ annotation: enrichResult.value[0] });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
