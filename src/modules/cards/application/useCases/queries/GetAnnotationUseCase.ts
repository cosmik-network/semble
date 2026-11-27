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
import { AnnotationCID } from '../../../domain/value-objects/AnnotationCID';
import { computeAnnotationCID } from '@semble/types';
import { IProfileService } from '../../../domain/services/IProfileService';
import {
  ICollectionQueryRepository,
  CollectionSortField,
} from '../../../domain/ICollectionQueryRepository';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { User } from '@semble/types';
import { ValidationError } from './GetAnnotationsForUrlUseCase';

export interface GetAnnotationQuery {
  /** The passage's stable content ID — takes precedence over url + exact */
  cid?: string;
  url?: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact?: string;
  callingUserId?: string;
}

// Enriched annotation view — same shape as the annotation variant of
// GetAnnotationsForUrlUseCase's list items
export type AnnotationViewDTO = Omit<AnnotationCardView, 'authorId'> & {
  author: User;
};

export interface GetAnnotationResult {
  /** The passage's stable content ID */
  cid: string;
  annotation?: AnnotationViewDTO;
  /** The matched passage's raw exact text — echoed when resolved by cid */
  exact?: string;
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
    // Resolve the query to a passage: either directly by CID (the stored
    // annotation_cid column reverses the hash) or by validating url + exact
    let url: string;
    let exactNormalized: string;
    let exactEcho: string | undefined;

    if (query.cid) {
      const cidResult = AnnotationCID.createFromString(query.cid);
      if (cidResult.isErr()) {
        return err(new ValidationError(cidResult.error.message));
      }
      const passage = await this.cardQueryRepo.getAnnotationPassageByCid(
        query.cid,
      );
      if (!passage) {
        return ok({ cid: query.cid });
      }
      url = passage.url;
      exactNormalized = passage.exactNormalized;
      exactEcho = passage.exact;
    } else {
      if (!query.url || query.exact === undefined) {
        return err(
          new ValidationError('Provide either cid, or both url and exact'),
        );
      }
      const urlResult = URL.create(query.url);
      if (urlResult.isErr()) {
        return err(
          new ValidationError(`Invalid URL: ${urlResult.error.message}`),
        );
      }
      url = urlResult.value.value;

      // Matching key — same normalization the write path stores
      exactNormalized = normalizeQuotedText(query.exact ?? '');
      if (exactNormalized.length === 0) {
        return err(new ValidationError('exact text is required'));
      }
    }

    const cid = computeAnnotationCID(url, exactNormalized);

    try {
      // Tab counts and the passage's representative view are independent —
      // limit 1 reads, the totals are what matter
      const [cardIds, notes] = await Promise.all([
        this.cardQueryRepo.getMatchingAnnotationCardIds(url, exactNormalized),
        this.cardQueryRepo.getNotesForAnnotation(url, exactNormalized, {
          page: 1,
          limit: 1,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        }),
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
        return ok({
          cid,
          exact: exactEcho,
          collectionCount,
          noteCount: notes.totalCount,
        });
      }

      const views =
        await this.cardQueryRepo.getBatchAnnotationCardViews(cardIds);
      const representative = [...views.values()].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      )[0];
      if (!representative) {
        return ok({
          cid,
          exact: exactEcho,
          collectionCount,
          noteCount: notes.totalCount,
        });
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
        cid,
        annotation: enrichResult.value[0],
        exact: exactEcho,
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
