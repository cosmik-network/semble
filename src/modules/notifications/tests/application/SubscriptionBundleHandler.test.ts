import { SubscriptionBundleHandler } from '../../application/bundleHandlers/SubscriptionBundleHandler';
import { CardActivityBundle } from '../../application/bundleHandlers/ICardActivityBundleHandler';
import { BundleRecipientResolver } from '../../application/services/BundleRecipientResolver';
import { ok } from '../../../../shared/core/Result';
import { NotificationType } from '@semble/types';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';

const ACTOR = 'did:plc:actor';
const SUBSCRIBER = 'did:plc:subscriber';
const BSKY_AUTHOR = 'did:plc:bskyauthor';

function makeBundle(
  overrides: Partial<CardActivityBundle> = {},
): CardActivityBundle {
  return {
    cardId: 'main-card',
    actorId: ACTOR,
    collectionIds: [],
    hasLibraryEvent: true,
    hasCollectionEvents: false,
    bundledAt: new Date(),
    ...overrides,
  };
}

function makeFakeFollow(followerDid: string, targetId: string) {
  return {
    followerId: { value: followerDid },
    targetId,
  } as any;
}

describe('SubscriptionBundleHandler dedup against BundleRecipientResolver', () => {
  it('does not emit SUBSCRIBED_USER_ADDED_CARD to a recipient already in the resolver exclusion set', async () => {
    const bundle = makeBundle();

    const followsRepository = {
      getSubscribersForScope: jest.fn(
        async (
          _targetId: string,
          targetType: FollowTargetType,
          scope: SubscriptionScopeEnum,
        ) => {
          if (
            targetType.value === FollowTargetTypeEnum.USER &&
            scope === SubscriptionScopeEnum.CARD
          ) {
            return ok([makeFakeFollow(BSKY_AUTHOR, ACTOR)]);
          }
          return ok([]);
        },
      ),
    } as any;

    const cardRepository = {
      findById: jest.fn(async () => ok(null as any)),
    } as any;

    const createNotificationUseCase = {
      execute: jest.fn(async () => ok({ notificationId: 'n1' })),
    } as any;

    const collectionUrlResolver = {
      resolve: jest.fn(async () => null),
    } as any;

    // Resolver pretends the bundle has a URL-mention author == BSKY_AUTHOR
    // (the same DID who also subscribes to the actor with CARD scope).
    const resolver = {
      resolveSpecificRecipients: jest.fn(async () => new Set([BSKY_AUTHOR])),
    } as unknown as BundleRecipientResolver;

    const handler = new SubscriptionBundleHandler(
      followsRepository,
      cardRepository,
      createNotificationUseCase,
      collectionUrlResolver,
      resolver,
    );

    await handler.handle(bundle);

    expect(createNotificationUseCase.execute).not.toHaveBeenCalled();
  });

  it('still emits SUBSCRIBED_USER_ADDED_CARD to subscribers not in the exclusion set', async () => {
    const bundle = makeBundle();

    const followsRepository = {
      getSubscribersForScope: jest.fn(
        async (
          _targetId: string,
          targetType: FollowTargetType,
          scope: SubscriptionScopeEnum,
        ) => {
          if (
            targetType.value === FollowTargetTypeEnum.USER &&
            scope === SubscriptionScopeEnum.CARD
          ) {
            return ok([makeFakeFollow(SUBSCRIBER, ACTOR)]);
          }
          return ok([]);
        },
      ),
    } as any;

    const cardRepository = {
      findById: jest.fn(async () => ok(null as any)),
    } as any;

    const createNotificationUseCase = {
      execute: jest.fn(async () => ok({ notificationId: 'n1' })),
    } as any;

    const collectionUrlResolver = {
      resolve: jest.fn(async () => null),
    } as any;

    const resolver = {
      resolveSpecificRecipients: jest.fn(async () => new Set<string>()),
    } as unknown as BundleRecipientResolver;

    const handler = new SubscriptionBundleHandler(
      followsRepository,
      cardRepository,
      createNotificationUseCase,
      collectionUrlResolver,
      resolver,
    );

    await handler.handle(bundle);

    expect(createNotificationUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.SUBSCRIBED_USER_ADDED_CARD,
        recipientUserId: SUBSCRIBER,
        actorUserId: ACTOR,
      }),
    );
  });

  it('excludes the actor even if the resolver returns an empty set', async () => {
    const bundle = makeBundle();

    const followsRepository = {
      getSubscribersForScope: jest.fn(
        async (
          _targetId: string,
          targetType: FollowTargetType,
          scope: SubscriptionScopeEnum,
        ) => {
          if (
            targetType.value === FollowTargetTypeEnum.USER &&
            scope === SubscriptionScopeEnum.CARD
          ) {
            return ok([makeFakeFollow(ACTOR, ACTOR)]);
          }
          return ok([]);
        },
      ),
    } as any;

    const cardRepository = {
      findById: jest.fn(async () => ok(null as any)),
    } as any;

    const createNotificationUseCase = {
      execute: jest.fn(async () => ok({ notificationId: 'n1' })),
    } as any;

    const collectionUrlResolver = {
      resolve: jest.fn(async () => null),
    } as any;

    const resolver = {
      resolveSpecificRecipients: jest.fn(async () => new Set<string>()),
    } as unknown as BundleRecipientResolver;

    const handler = new SubscriptionBundleHandler(
      followsRepository,
      cardRepository,
      createNotificationUseCase,
      collectionUrlResolver,
      resolver,
    );

    await handler.handle(bundle);

    expect(createNotificationUseCase.execute).not.toHaveBeenCalled();
  });
});
