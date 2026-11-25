import { AnnotationCreatedNotificationHandler } from '../../application/eventHandlers/AnnotationCreatedNotificationHandler';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import {
  FollowTargetType,
  FollowTargetTypeEnum,
} from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';
import { ok } from '../../../../shared/core/Result';

const ACTOR = 'did:plc:actor';
const URL_LIB_USER = 'did:plc:urllib';
const SUBSCRIBER = 'did:plc:subscriber';
const BOTH_USER = 'did:plc:both';
const URL = 'https://example.com/page';
const CARD_ID = '33333333-3333-4333-8333-333333333333';

function makeEvent() {
  return CardAddedToLibraryEvent.create(
    CardId.createFromString(CARD_ID).unwrap(),
    CuratorId.create(ACTOR).unwrap(),
    new Date(),
  ).unwrap();
}

function makeFakeFollow(followerDid: string) {
  return { followerId: { value: followerDid } } as any;
}

function makeHandler(props: {
  card: any;
  urlLibraries: string[];
  subscribers?: string[];
  notificationService?: any;
}) {
  const notificationService =
    props.notificationService ??
    ({
      createOrAppendUserAnnotatedYourUrlNotification: jest.fn(async () =>
        ok({ notificationId: { getStringValue: () => 'n1' } } as any),
      ),
    } as any);

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
          return ok(
            (props.subscribers ?? []).map((did) => makeFakeFollow(did)),
          );
        }
        return ok([]);
      },
    ),
  } as any;

  const handler = new AnnotationCreatedNotificationHandler(
    { findById: jest.fn(async () => ok(props.card)) } as any,
    {
      getLibrariesForUrl: jest.fn(async () => ({
        items: props.urlLibraries.map((userId) => ({ userId })),
      })),
    } as any,
    followsRepository,
    notificationService,
    { withLock: (_key: string, _ttl: number, fn: () => any) => fn() } as any,
    20 * 60 * 1000,
  );

  return { handler, notificationService };
}

const ANNOTATION_CARD = {
  isAnnotationCard: true,
  viaCardId: undefined,
  url: { value: URL },
};

describe('AnnotationCreatedNotificationHandler', () => {
  it('notifies URL-library members with the specific type and subscribers with the subscribed type', async () => {
    const { handler, notificationService } = makeHandler({
      card: ANNOTATION_CARD,
      urlLibraries: [ACTOR, URL_LIB_USER],
      subscribers: [SUBSCRIBER],
    });

    const result = await handler.handle(makeEvent());
    expect(result.isOk()).toBe(true);

    const calls = (
      notificationService.createOrAppendUserAnnotatedYourUrlNotification as jest.Mock
    ).mock.calls;
    expect(calls).toHaveLength(2);

    const byRecipient = new Map(calls.map((call) => [call[0].value, call]));
    // (recipientId, actorId, url, annotationId, batchWindowMs, type)
    expect(byRecipient.get(URL_LIB_USER)![5]).toBe('USER_ANNOTATED_YOUR_URL');
    expect(byRecipient.get(SUBSCRIBER)![5]).toBe(
      'SUBSCRIBED_USER_ANNOTATED_URL',
    );
    expect(calls[0][2]).toBe(URL);
    expect(calls[0][3].getStringValue()).toBe(CARD_ID);
    expect(calls[0][4]).toBe(20 * 60 * 1000);
  });

  it('gives the specific notification precedence when the user is both a URL-library member and a subscriber', async () => {
    const { handler, notificationService } = makeHandler({
      card: ANNOTATION_CARD,
      urlLibraries: [BOTH_USER],
      subscribers: [BOTH_USER, SUBSCRIBER],
    });

    await handler.handle(makeEvent());

    const calls = (
      notificationService.createOrAppendUserAnnotatedYourUrlNotification as jest.Mock
    ).mock.calls;
    const byRecipient = new Map(calls.map((call) => [call[0].value, call]));
    expect(byRecipient.size).toBe(2);
    expect(byRecipient.get(BOTH_USER)![5]).toBe('USER_ANNOTATED_YOUR_URL');
    expect(byRecipient.get(SUBSCRIBER)![5]).toBe(
      'SUBSCRIBED_USER_ANNOTATED_URL',
    );
  });

  it('skips URL cards and via-card saves', async () => {
    for (const card of [
      { isAnnotationCard: false, url: { value: URL } },
      { ...ANNOTATION_CARD, viaCardId: { getStringValue: () => 'via' } },
    ]) {
      const { handler, notificationService } = makeHandler({
        card,
        urlLibraries: [URL_LIB_USER],
        subscribers: [SUBSCRIBER],
      });

      await handler.handle(makeEvent());

      expect(
        notificationService.createOrAppendUserAnnotatedYourUrlNotification,
      ).not.toHaveBeenCalled();
    }
  });
});
