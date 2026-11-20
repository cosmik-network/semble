import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICollectionQueryRepository,
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { IProfileService } from '../../../domain/services/IProfileService';
import { GetCollectionsForAnnotationResponse, Collection } from '@semble/types';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { ValidationError } from './GetAnnotationsForUrlUseCase';

export interface GetCollectionsForAnnotationQuery {
  url: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CollectionSortField;
  sortOrder?: SortOrder;
}

// Use the shared API type directly
export type GetCollectionsForAnnotationResult =
  GetCollectionsForAnnotationResponse;

export class GetCollectionsForAnnotationUseCase implements UseCase<
  GetCollectionsForAnnotationQuery,
  Result<GetCollectionsForAnnotationResult>
> {
  constructor(
    private collectionQueryRepo: ICollectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: GetCollectionsForAnnotationQuery,
  ): Promise<Result<GetCollectionsForAnnotationResult>> {
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
    const sortBy = query.sortBy || CollectionSortField.ADDED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      // First find all annotation cards matching the passage, then the
      // collections containing any of them
      const cardIds = await this.cardQueryRepo.getMatchingAnnotationCardIds(
        urlResult.value.value,
        exactNormalized,
      );

      const result =
        await this.collectionQueryRepo.getCollectionsContainingCards(cardIds, {
          page,
          limit,
          sortBy,
          sortOrder,
        });

      // Build profile map using ProfileEnricher utility; the follow-status
      // lookup only needs collection ids, so it runs in parallel
      const profileEnricher = new ProfileEnricher(this.profileService);
      const uniqueAuthorIds = Array.from(
        new Set(result.items.map((item) => item.authorId)),
      );

      const [profileMapResult, followsResult] = await Promise.all([
        profileEnricher.buildProfileMap(uniqueAuthorIds, query.callingUserId, {
          skipFailures: true, // Skip profiles that fail to resolve
          mapToUser: false, // Use inline profile (without isFollowing)
        }),
        query.callingUserId
          ? this.followsRepository.findByFollowerAndTargets(
              query.callingUserId,
              result.items.map((item) => item.id),
              FollowTargetType.COLLECTION,
            )
          : null,
      ]);

      if (profileMapResult.isErr()) {
        return err(profileMapResult.error);
      }

      const profileMap = profileMapResult.value;

      // Map items with enriched author data and full collection data
      // Filter out collections with missing author profiles
      const enrichedCollections = result.items
        .map((item) => {
          const author = profileMap.get(item.authorId);
          if (!author) {
            return null; // Skip collections with missing author profiles
          }

          return {
            id: item.id,
            uri: item.uri,
            name: item.name,
            description: item.description,
            accessType: item.accessType,
            author,
            cardCount: item.cardCount,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          };
        })
        .filter((collection) => collection !== null) as Collection[];

      // Add follow status if callingUserId is provided
      if (followsResult) {
        const followedCollectionIds = new Set(
          followsResult.isOk()
            ? followsResult.value.map((follow) => follow.targetId)
            : [],
        );

        enrichedCollections.forEach((collection) => {
          collection.isFollowing = followedCollectionIds.has(collection.id);
        });
      }

      return ok({
        collections: enrichedCollections,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.totalCount / limit),
          totalCount: result.totalCount,
          hasMore: result.hasMore,
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
          `Failed to retrieve collections for annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
