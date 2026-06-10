import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { Collection, User } from '@semble/types';
import { ProfileEnricher } from 'src/modules/cards/application/services/ProfileEnricher';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';

export interface GetMySubscriptionsQuery {
  userId: string; // DID of authenticated user
  targetType?: 'USER' | 'COLLECTION';
  page?: number;
  limit?: number;
}

export type SubscriptionItem =
  | { type: 'USER'; user: User; subscribedAt: string }
  | { type: 'COLLECTION'; collection: Collection; subscribedAt: string };

export interface GetMySubscriptionsResult {
  items: SubscriptionItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
}

export class GetMySubscriptionsUseCase implements UseCase<
  GetMySubscriptionsQuery,
  Result<GetMySubscriptionsResult>
> {
  constructor(
    private followsRepository: IFollowsRepository,
    private profileService: IProfileService,
    private collectionRepository: ICollectionRepository,
  ) {}

  async execute(
    query: GetMySubscriptionsQuery,
  ): Promise<Result<GetMySubscriptionsResult>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    let targetType: FollowTargetType | undefined;
    if (query.targetType) {
      const targetTypeResult = FollowTargetType.create(query.targetType as any);
      if (targetTypeResult.isErr()) {
        return err(new Error('Invalid target type'));
      }
      targetType = targetTypeResult.value;
    }

    const followsResult = await this.followsRepository.getSubscriptions(
      query.userId,
      targetType,
      { page, limit },
    );

    if (followsResult.isErr()) {
      return err(
        new Error(
          `Failed to retrieve subscriptions: ${followsResult.error instanceof Error ? followsResult.error.message : 'Unknown error'}`,
        ),
      );
    }

    const { follows, totalCount } = followsResult.value;

    const userTargetIds = Array.from(
      new Set(
        follows
          .filter((f) => f.targetType.value === 'USER')
          .map((f) => f.targetId),
      ),
    );
    const collectionTargetIds = Array.from(
      new Set(
        follows
          .filter((f) => f.targetType.value === 'COLLECTION')
          .map((f) => f.targetId),
      ),
    );

    // Fetch user profiles
    const profileEnricher = new ProfileEnricher(this.profileService);
    const userMap = new Map<string, User>();
    if (userTargetIds.length > 0) {
      const profileMapResult = await profileEnricher.buildProfileMap(
        userTargetIds,
        query.userId,
        { skipFailures: true, mapToUser: true },
      );
      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch user profiles: ${profileMapResult.error.message}`,
          ),
        );
      }
      for (const [id, user] of profileMapResult.value.entries()) {
        userMap.set(id, user);
      }
    }

    // Fetch collections + their author profiles
    const collectionMap = new Map<string, Collection>();
    if (collectionTargetIds.length > 0) {
      const collectionResults = await Promise.all(
        collectionTargetIds.map(async (id) => {
          const idResult = CollectionId.createFromString(id);
          if (idResult.isErr()) return null;
          const result = await this.collectionRepository.findById(
            idResult.value,
          );
          if (result.isErr() || !result.value) return null;
          return result.value;
        }),
      );

      const authorIds = new Set<string>();
      for (const collection of collectionResults) {
        if (collection) authorIds.add(collection.authorId.value);
      }

      const authorMap = new Map<string, User>();
      if (authorIds.size > 0) {
        const authorMapResult = await profileEnricher.buildProfileMap(
          Array.from(authorIds),
          query.userId,
          { skipFailures: true, mapToUser: true },
        );
        if (authorMapResult.isErr()) {
          return err(
            new Error(
              `Failed to fetch collection author profiles: ${authorMapResult.error.message}`,
            ),
          );
        }
        for (const [id, user] of authorMapResult.value.entries()) {
          authorMap.set(id, user);
        }
      }

      for (let i = 0; i < collectionTargetIds.length; i++) {
        const id = collectionTargetIds[i];
        const collection = collectionResults[i];
        if (!id || !collection) continue;
        const author = authorMap.get(collection.authorId.value);
        if (!author) continue;
        collectionMap.set(id, {
          id,
          uri: collection.publishedRecordId?.getValue().uri,
          name: collection.name.value,
          author,
          description: collection.description?.value,
          accessType: collection.accessType,
          cardCount: collection.cardCount,
          createdAt: collection.createdAt.toISOString(),
          updatedAt: collection.updatedAt.toISOString(),
          isFollowing: true,
        });
      }
    }

    const items: SubscriptionItem[] = [];
    for (const follow of follows) {
      const subscribedAt = (
        follow.subscribedAt ?? follow.createdAt
      ).toISOString();
      if (follow.targetType.value === 'USER') {
        const user = userMap.get(follow.targetId);
        if (!user) continue;
        items.push({ type: 'USER', user, subscribedAt });
      } else if (follow.targetType.value === 'COLLECTION') {
        const collection = collectionMap.get(follow.targetId);
        if (!collection) continue;
        items.push({ type: 'COLLECTION', collection, subscribedAt });
      }
    }

    return ok({
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: page * limit < totalCount,
        limit,
      },
    });
  }
}
