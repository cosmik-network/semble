import { AnnotationCreatedNotificationHandler } from '../../application/eventHandlers/AnnotationCreatedNotificationHandler';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { ok } from '../../../../shared/core/Result';

const ACTOR = 'did:plc:actor';
const URL_LIB_USER = 'did:plc:urllib';
const URL_LIB_USER_2 = 'did:plc:urllib2';
const URL = 'https://example.com/page';
const CARD_ID = '33333333-3333-4333-8333-333333333333';

function makeEvent() {
  return CardAddedToLibraryEvent.create(
    CardId.createFromString(CARD_ID).unwrap(),
    CuratorId.create(ACTOR).unwrap(),
    new Date(),
  ).unwrap();
}

function makeHandler(props: {
  card: any;
  urlLibraries: string[];
  notificationService?: any;
}) {
  const notificationService =
    props.notificationService ??
    ({
      createOrAppendUserAnnotatedYourUrlNotification: jest.fn(async () =>
        ok({ notificationId: { getStringValue: () => 'n1' } } as any),
      ),
    } as any);

  const handler = new AnnotationCreatedNotificationHandler(
    { findById: jest.fn(async () => ok(props.card)) } as any,
    {
      getLibrariesForUrl: jest.fn(async () => ({
        items: props.urlLibraries.map((userId) => ({ userId })),
      })),
    } as any,
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
  it('notifies every URL-library member except the actor', async () => {
    const { handler, notificationService } = makeHandler({
      card: ANNOTATION_CARD,
      urlLibraries: [ACTOR, URL_LIB_USER, URL_LIB_USER_2],
    });

    const result = await handler.handle(makeEvent());
    expect(result.isOk()).toBe(true);

    const calls = (
      notificationService.createOrAppendUserAnnotatedYourUrlNotification as jest.Mock
    ).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call[0].value)).toEqual([
      URL_LIB_USER,
      URL_LIB_USER_2,
    ]);
    // (recipientId, actorId, url, annotationId, batchWindowMs)
    expect(calls[0][2]).toBe(URL);
    expect(calls[0][3].getStringValue()).toBe(CARD_ID);
    expect(calls[0][4]).toBe(20 * 60 * 1000);
  });

  it('skips URL cards and via-card saves', async () => {
    for (const card of [
      { isAnnotationCard: false, url: { value: URL } },
      { ...ANNOTATION_CARD, viaCardId: { getStringValue: () => 'via' } },
    ]) {
      const { handler, notificationService } = makeHandler({
        card,
        urlLibraries: [URL_LIB_USER],
      });

      await handler.handle(makeEvent());

      expect(
        notificationService.createOrAppendUserAnnotatedYourUrlNotification,
      ).not.toHaveBeenCalled();
    }
  });
});
