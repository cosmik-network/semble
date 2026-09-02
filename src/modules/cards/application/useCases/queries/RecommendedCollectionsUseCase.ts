import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { CollectionDTO, User } from '@semble/types';
import {
  ICollectionQueryRepository,
  CollectionWithMatchedUrlsDTO,
} from '../../../domain/ICollectionQueryRepository';
import { CollectionAccessType } from '../../../domain/Collection';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';
import {
  IBskyFollowsService,
  BskyFollowedProfile,
} from 'src/modules/user/application/services/IBskyFollowsService';
import { GlobalFeedSeedService } from 'src/modules/feeds/application/services/GlobalFeedSeedService';

export interface RecommendedCollectionsRankingConfig {
  // Applied to log1p(cardCount) so size helps but can't dominate
  cardCountWeight: number;
  // Applied to log1p(followerCount) so a few followers matter, hundreds don't pile on
  followerWeight: number;
  // Max score contribution for update recency; decays exponentially with age
  recencyWeight: number;
  recencyHalfLifeDays: number;
  // Bonus per additional seed URL the collection contains beyond the first;
  // rewards collections relevant to several of the caller's URLs at once
  urlOverlapWeight: number;
  // Flat bonus when the collection author is followed on Bluesky by the caller
  bskyFollowWeight: number;
  // 0 = fully deterministic ranking, 1 = maximum jitter (still skewed toward higher scores)
  randomness: number;
}

export const DEFAULT_COLLECTION_RANKING_CONFIG: RecommendedCollectionsRankingConfig =
  {
    cardCountWeight: 2, // 100 cards ≈ +9, 1000 cards ≈ +14
    followerWeight: 8, // 5 followers ≈ +14, 50 followers ≈ +31
    recencyWeight: 20,
    recencyHalfLifeDays: 14,
    urlOverlapWeight: 10,
    bskyFollowWeight: 30,
    randomness: 0.5,
  };

const MAX_RESULTS = 20;

export interface RecommendedCollectionsQuery {
  // When empty and there's no calling user, seed URLs are drawn from random
  // recent cards in the global feed.
  urls?: string[];
  callingUserId?: string;
}

export type RecommendedCollection = CollectionDTO & {
  authorFollowedOnBsky: boolean;
};

export interface RecommendedCollectionsResult {
  collections: RecommendedCollection[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class RecommendedCollectionsUseCase implements UseCase<
  RecommendedCollectionsQuery,
  Result<
    RecommendedCollectionsResult,
    ValidationError | AppError.UnexpectedError
  >
> {
  private config: RecommendedCollectionsRankingConfig;

  constructor(
    private collectionQueryRepo: ICollectionQueryRepository,
    private followsRepository: IFollowsRepository,
    private bskyFollowsService: IBskyFollowsService,
    private profileService: IProfileService,
    config?: Partial<RecommendedCollectionsRankingConfig>,
    // Used to derive seed URLs for unauthenticated callers, who have no
    // library to sample from. Absent in setups without a feed repository.
    private globalFeedSeedService?: GlobalFeedSeedService,
  ) {
    this.config = { ...DEFAULT_COLLECTION_RANKING_CONFIG, ...config };
  }

  async execute(
    query: RecommendedCollectionsQuery,
  ): Promise<
    Result<
      RecommendedCollectionsResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      const callingUserId = query.callingUserId;

      let urls = (query.urls || []).filter((u) => u.trim().length > 0);
      if (urls.length === 0) {
        if (callingUserId) {
          // Authenticated callers are expected to supply the URLs they want
          // recommendations for.
          return err(new ValidationError('At least one URL is required'));
        }
        // Unauthenticated: seed from what the network has recently saved.
        urls = await this.deriveUrlsFromGlobalFeed();
        if (urls.length === 0) {
          return ok({ collections: [] });
        }
      }

      // 1. In parallel: collections containing the URLs + Semble users followed
      // on Bluesky (only meaningful for an authenticated caller)
      const [urlCollections, bskyFollowedResult] = await Promise.all([
        this.collectionQueryRepo.getCollectionsForUrls(urls),
        callingUserId
          ? this.bskyFollowsService.getSembleUsersFollowedOnBsky(callingUserId)
          : undefined,
      ]);

      // Best-effort: recommendations still work if the Bluesky lookup fails
      let bskyFollowedProfiles = new Map<string, BskyFollowedProfile>();
      if (bskyFollowedResult) {
        if (bskyFollowedResult.isOk()) {
          bskyFollowedProfiles = bskyFollowedResult.value;
        } else {
          console.warn(
            `RecommendedCollectionsUseCase: failed to fetch Bluesky follows: ${bskyFollowedResult.error.message}`,
          );
        }
      }

      // 2. Dedupe by collection id, excluding the caller's own collections
      const collectionsById = new Map<string, CollectionWithMatchedUrlsDTO>();
      urlCollections.forEach((collection) => {
        if (callingUserId && collection.authorId === callingUserId) return;
        collectionsById.set(collection.id, collection);
      });
      const candidates = Array.from(collectionsById.values());

      if (candidates.length === 0) {
        return ok({ collections: [] });
      }

      const candidateIds = candidates.map((c) => c.id);

      // 3. Drop collections the calling user already follows on Semble.
      // Nothing to exclude for an unauthenticated caller.
      let unfollowedCandidates = candidates;
      if (callingUserId) {
        const followingResult =
          await this.followsRepository.checkFollowingMultiple(
            callingUserId,
            candidateIds,
            FollowTargetType.COLLECTION,
          );
        if (followingResult.isErr()) {
          return err(AppError.UnexpectedError.create(followingResult.error));
        }
        const followingMap = followingResult.value;
        unfollowedCandidates = candidates.filter(
          (c) => !followingMap.get(c.id),
        );
      }

      if (unfollowedCandidates.length === 0) {
        return ok({ collections: [] });
      }

      const collectionIds = unfollowedCandidates.map((c) => c.id);

      // 4. Fetch follower counts for the remaining candidates
      const followerCountsResult =
        await this.followsRepository.getBatchFollowersCount(
          collectionIds,
          FollowTargetType.COLLECTION,
        );
      if (followerCountsResult.isErr()) {
        return err(AppError.UnexpectedError.create(followerCountsResult.error));
      }
      const followerCounts = followerCountsResult.value;

      // 5. Score with randomness, sort, take top N
      const ranked = unfollowedCandidates
        .map((collection) => ({
          collection,
          score: this.computeRankKey(
            collection,
            followerCounts.get(collection.id) || 0,
            bskyFollowedProfiles.has(collection.authorId),
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS);

      // 6. Enrich author profiles. Bluesky-followed authors already carry
      // profile data from getFollows, so only fetch the rest.
      const authorIds = [
        ...new Set(ranked.map(({ collection }) => collection.authorId)),
      ];
      const authorIdsNeedingProfiles = authorIds.filter(
        (did) => !bskyFollowedProfiles.has(did),
      );

      let profileMap = new Map<string, User>();
      if (authorIdsNeedingProfiles.length > 0) {
        const profileEnricher = new ProfileEnricher(this.profileService);
        const profileMapResult = await profileEnricher.buildProfileMap(
          authorIdsNeedingProfiles,
          undefined,
          {
            skipFailures: true,
            mapToUser: false,
          },
        );
        if (profileMapResult.isErr()) {
          return err(AppError.UnexpectedError.create(profileMapResult.error));
        }
        profileMap = profileMapResult.value;
      }

      const collections: RecommendedCollection[] = ranked
        .map(({ collection }): RecommendedCollection | null => {
          const bskyProfile = bskyFollowedProfiles.get(collection.authorId);
          const profile = bskyProfile
            ? this.toAuthorProfile(bskyProfile)
            : profileMap.get(collection.authorId);
          if (!profile) return null;

          return {
            id: collection.id,
            uri: collection.uri,
            name: collection.name,
            description: collection.description,
            accessType: collection.accessType as CollectionAccessType,
            createdAt: collection.createdAt.toISOString(),
            updatedAt: collection.updatedAt.toISOString(),
            cardCount: collection.cardCount,
            author: profile,
            // Collections the caller already follows were excluded above
            isFollowing: false,
            followerCount: followerCounts.get(collection.id) || 0,
            authorFollowedOnBsky: bskyFollowedProfiles.has(collection.authorId),
          };
        })
        .filter(
          (collection): collection is RecommendedCollection =>
            collection !== null,
        );

      return ok({ collections });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  /**
   * Seeds from the network rather than a library: URLs of random recent cards
   * out of the latest global feed activity. Returns an empty array when no
   * feed seed service is configured or the feed yields nothing usable.
   */
  private async deriveUrlsFromGlobalFeed(): Promise<string[]> {
    if (!this.globalFeedSeedService) {
      return [];
    }

    const seedCards = await this.globalFeedSeedService.getSeedCards();
    return [
      ...new Set(
        seedCards.map((card) => card.url).filter((url) => !!url?.trim()),
      ),
    ];
  }

  private toAuthorProfile(bskyProfile: BskyFollowedProfile): User {
    return {
      id: bskyProfile.did,
      name: bskyProfile.displayName || bskyProfile.handle,
      handle: bskyProfile.handle,
      avatarUrl: bskyProfile.avatarUrl,
      description: bskyProfile.description,
    };
  }

  private computeRankKey(
    collection: CollectionWithMatchedUrlsDTO,
    followerCount: number,
    authorFollowedOnBsky: boolean,
  ): number {
    // log1p dampens raw counts so huge collections and follower piles don't
    // drown out recency and relevance signals
    let score =
      this.config.cardCountWeight * Math.log1p(collection.cardCount) +
      this.config.followerWeight * Math.log1p(followerCount);

    // Every candidate matches at least one seed URL; extra matches signal
    // the collection is relevant to more of what the caller is looking at
    score +=
      this.config.urlOverlapWeight *
      Math.max(0, collection.matchedUrls.length - 1);

    const ageDays =
      (Date.now() - collection.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    score +=
      this.config.recencyWeight *
      Math.pow(0.5, ageDays / this.config.recencyHalfLifeDays);

    if (authorFollowedOnBsky) {
      score += this.config.bskyFollowWeight;
    }

    // Multiplicative jitter: randomness=0 keeps deterministic order,
    // randomness=1 scales each score by a uniform random factor in [0, 1].
    // The +1 base lets zero-score collections shuffle among themselves too.
    const randomness = Math.min(Math.max(this.config.randomness, 0), 1);
    const jitter = 1 - randomness + randomness * Math.random();
    return (score + 1) * jitter;
  }
}
