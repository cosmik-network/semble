import { ConnectionCreatedEventHandler } from '../../application/eventHandlers/ConnectionCreatedEventHandler';
import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { ConnectionId } from '../../../cards/domain/value-objects/ConnectionId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { ok } from '../../../../shared/core/Result';
import { NotificationType } from '@semble/types';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';

const CURATOR = 'did:plc:curator';
const LIB_USER_AND_SUBSCRIBER = 'did:plc:libusersubscriber';
const SOURCE_URL = 'https://example.com/source';
const TARGET_URL = 'https://example.com/target';

function makeFakeFollow(followerDid: string, targetId: string) {
  return {
    followerId: { value: followerDid },
    targetId,
  } as any;
}

describe('ConnectionCreatedEventHandler subscription dedup', () => {
  it('does not emit SUBSCRIBED_USER_MADE_CONNECTION to a recipient who already received USER_CONNECTED_YOUR_URL', async () => {
    const connectionId = ConnectionId.createFromString('conn-1').unwrap();
    const curatorId = CuratorId.create(CURATOR).unwrap();
    const event = ConnectionCreatedEvent.create(
      connectionId,
      curatorId,
    ).unwrap();

    const connectionRepository = {
      findById: jest.fn(async () =>
        ok({
          source: { url: { value: SOURCE_URL } },
          target: { url: { value: TARGET_URL } },
          curatorId,
        } as any),
      ),
    } as any;

    const cardQueryRepository = {
      getLibrariesForUrl: jest.fn(async (url: string) => ({
        items:
          url === SOURCE_URL
            ? [{ userId: LIB_USER_AND_SUBSCRIBER, cardId: 'c1' }]
            : [],
      })),
    } as any;

    const notificationService = {
      createUserConnectedYourUrlNotification: jest.fn(async () =>
        ok({ notificationId: { getStringValue: () => 'n-url' } } as any),
      ),
      createUserConnectedYourPostNotification: jest.fn(),
      createUserConnectedYourCollectionNotification: jest.fn(),
    } as any;

    const followsRepository = {
      getSubscribersForScope: jest.fn(
        async (
          _targetId: string,
          targetType: FollowTargetType,
          scope: SubscriptionScopeEnum,
        ) => {
          if (
            targetType.value === FollowTargetTypeEnum.USER &&
            scope === SubscriptionScopeEnum.CONNECTION
          ) {
            return ok([makeFakeFollow(LIB_USER_AND_SUBSCRIBER, CURATOR)]);
          }
          return ok([]);
        },
      ),
    } as any;

    const collectionUrlResolver = {
      resolve: jest.fn(async () => null),
    } as any;

    const createNotificationUseCase = {
      execute: jest.fn(async () => ok({ notificationId: 'n-sub' })),
    } as any;

    const handler = new ConnectionCreatedEventHandler(
      notificationService,
      connectionRepository,
      cardQueryRepository,
      { getAppConfig: () => ({ appUrl: 'https://semble.so' }) } as any,
      { findByDID: jest.fn() } as any,
      { resolveToDID: jest.fn() } as any,
      { findById: jest.fn() } as any,
      { resolveCollectionId: jest.fn() } as any,
      followsRepository,
      collectionUrlResolver,
      createNotificationUseCase,
    );

    await handler.handle(event);

    // The library-URL notification fired:
    expect(
      notificationService.createUserConnectedYourUrlNotification,
    ).toHaveBeenCalledTimes(1);
    // The subscription notification did NOT fire (recipient was already notified):
    expect(createNotificationUseCase.execute).not.toHaveBeenCalled();
  });

  it('still emits SUBSCRIBED_USER_MADE_CONNECTION to a subscriber who did not get a more specific notification', async () => {
    const connectionId = ConnectionId.createFromString('conn-2').unwrap();
    const curatorId = CuratorId.create(CURATOR).unwrap();
    const event = ConnectionCreatedEvent.create(
      connectionId,
      curatorId,
    ).unwrap();

    const subscriberOnly = 'did:plc:subscriberonly';

    const connectionRepository = {
      findById: jest.fn(async () =>
        ok({
          source: { url: { value: SOURCE_URL } },
          target: { url: { value: TARGET_URL } },
          curatorId,
        } as any),
      ),
    } as any;

    const cardQueryRepository = {
      getLibrariesForUrl: jest.fn(async () => ({ items: [] })),
    } as any;

    const notificationService = {
      createUserConnectedYourUrlNotification: jest.fn(),
      createUserConnectedYourPostNotification: jest.fn(),
      createUserConnectedYourCollectionNotification: jest.fn(),
    } as any;

    const followsRepository = {
      getSubscribersForScope: jest.fn(
        async (
          _targetId: string,
          targetType: FollowTargetType,
          scope: SubscriptionScopeEnum,
        ) => {
          if (
            targetType.value === FollowTargetTypeEnum.USER &&
            scope === SubscriptionScopeEnum.CONNECTION
          ) {
            return ok([makeFakeFollow(subscriberOnly, CURATOR)]);
          }
          return ok([]);
        },
      ),
    } as any;

    const collectionUrlResolver = {
      resolve: jest.fn(async () => null),
    } as any;

    const createNotificationUseCase = {
      execute: jest.fn(async () => ok({ notificationId: 'n-sub' })),
    } as any;

    const handler = new ConnectionCreatedEventHandler(
      notificationService,
      connectionRepository,
      cardQueryRepository,
      { getAppConfig: () => ({ appUrl: 'https://semble.so' }) } as any,
      { findByDID: jest.fn() } as any,
      { resolveToDID: jest.fn() } as any,
      { findById: jest.fn() } as any,
      { resolveCollectionId: jest.fn() } as any,
      followsRepository,
      collectionUrlResolver,
      createNotificationUseCase,
    );

    await handler.handle(event);

    expect(createNotificationUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.SUBSCRIBED_USER_MADE_CONNECTION,
        recipientUserId: subscriberOnly,
        actorUserId: CURATOR,
      }),
    );
  });
});
