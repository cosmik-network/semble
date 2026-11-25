import { ConnectionCreatedEventHandler } from '../../application/eventHandlers/ConnectionCreatedEventHandler';
import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { ConnectionId } from '../../../cards/domain/value-objects/ConnectionId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { ok } from '../../../../shared/core/Result';

const CURATOR = 'did:plc:curator';
const URL_LIB_USER = 'did:plc:urllib';
const ANNOTATION_LIB_USER = 'did:plc:annotlib';
const BOTH_LIB_USER = 'did:plc:bothlib';
const SOURCE_URL = 'https://example.com/source';
const ANNOTATION_CARD_ID = '11111111-1111-4111-8111-111111111111';
const PASSAGE = 'the exact quoted passage';

interface HandlerHarness {
  handler: ConnectionCreatedEventHandler;
  notificationService: any;
  createNotificationUseCase: any;
}

function makeHarness(props: {
  connection: any;
  getLibrariesForUrl: (url: string) => any;
  getLibrariesForAnnotation: (url: string, exactNormalized: string) => any;
}): HandlerHarness {
  const notificationService = {
    createUserConnectedYourUrlNotification: jest.fn(async () =>
      ok({ notificationId: { getStringValue: () => 'n-url' } } as any),
    ),
    createUserConnectedYourPostNotification: jest.fn(),
    createUserConnectedYourCollectionNotification: jest.fn(),
    createUserConnectedYourAnnotationNotification: jest.fn(async () =>
      ok({ notificationId: { getStringValue: () => 'n-annotation' } } as any),
    ),
  } as any;

  const createNotificationUseCase = {
    execute: jest.fn(async () => ok({ notificationId: 'n-sub' })),
  } as any;

  const cardQueryRepository = {
    getLibrariesForUrl: jest.fn(props.getLibrariesForUrl),
    getLibrariesForAnnotation: jest.fn(props.getLibrariesForAnnotation),
    getAnnotationCardById: jest.fn(async () => ({
      id: ANNOTATION_CARD_ID,
      url: SOURCE_URL,
      selectors: [{ type: 'TextQuoteSelector', exact: PASSAGE }],
    })),
  } as any;

  const handler = new ConnectionCreatedEventHandler(
    notificationService,
    { findById: jest.fn(async () => ok(props.connection)) } as any,
    cardQueryRepository,
    { getAppConfig: () => ({ appUrl: 'https://semble.so' }) } as any,
    { findByDID: jest.fn() } as any,
    { resolveToDID: jest.fn() } as any,
    { findById: jest.fn() } as any,
    { resolveCollectionId: jest.fn() } as any,
    {
      getSubscribersForScope: jest.fn(async () => ok([])),
    } as any,
    { resolve: jest.fn(async () => null) } as any,
    createNotificationUseCase,
    { resolveMentionedUsers: jest.fn(async () => []) } as any,
  );

  return { handler, notificationService, createNotificationUseCase };
}

function makeEvent(rkey: string) {
  return ConnectionCreatedEvent.create(
    ConnectionId.createFromString(rkey).unwrap(),
    CuratorId.create(CURATOR).unwrap(),
  ).unwrap();
}

describe('ConnectionCreatedEventHandler annotation endpoints', () => {
  it('notifies annotation-library users with USER_CONNECTED_YOUR_ANNOTATION and URL-library users with USER_CONNECTED_YOUR_URL', async () => {
    const { handler, notificationService } = makeHarness({
      connection: {
        source: { url: { value: SOURCE_URL }, cardId: null },
        target: {
          url: null,
          cardId: { getStringValue: () => ANNOTATION_CARD_ID },
        },
        curatorId: CuratorId.create(CURATOR).unwrap(),
      },
      getLibrariesForUrl: () => ({
        items: [{ userId: URL_LIB_USER }, { userId: BOTH_LIB_USER }],
      }),
      getLibrariesForAnnotation: () => ({
        items: [{ userId: ANNOTATION_LIB_USER }, { userId: BOTH_LIB_USER }],
      }),
    });

    await handler.handle(makeEvent('conn-annot-1'));

    // URL-side recipients exclude BOTH_LIB_USER (annotation wins on overlap)
    const urlCalls = (
      notificationService.createUserConnectedYourUrlNotification as jest.Mock
    ).mock.calls;
    expect(urlCalls).toHaveLength(1);
    expect(urlCalls[0][0].value).toBe(URL_LIB_USER);

    expect(
      notificationService.createUserConnectedYourAnnotationNotification,
    ).toHaveBeenCalledTimes(2);
    const annotationRecipients = (
      notificationService.createUserConnectedYourAnnotationNotification as jest.Mock
    ).mock.calls.map((call) => call[0].value);
    expect(annotationRecipients).toEqual(
      expect.arrayContaining([ANNOTATION_LIB_USER, BOTH_LIB_USER]),
    );
  });

  it('creates only one notification when both endpoints are annotations in the recipient library', async () => {
    const otherAnnotationCardId = '22222222-2222-4222-8222-222222222222';

    const { handler, notificationService } = makeHarness({
      connection: {
        source: {
          url: null,
          cardId: { getStringValue: () => ANNOTATION_CARD_ID },
        },
        target: {
          url: null,
          cardId: { getStringValue: () => otherAnnotationCardId },
        },
        curatorId: CuratorId.create(CURATOR).unwrap(),
      },
      getLibrariesForUrl: () => ({ items: [] }),
      getLibrariesForAnnotation: () => ({
        items: [{ userId: BOTH_LIB_USER }],
      }),
    });

    await handler.handle(makeEvent('conn-annot-2'));

    expect(
      notificationService.createUserConnectedYourAnnotationNotification,
    ).toHaveBeenCalledTimes(1);
    expect(
      notificationService.createUserConnectedYourUrlNotification,
    ).not.toHaveBeenCalled();
  });

  it('matches annotation library members by url + normalized passage', async () => {
    const getLibrariesForAnnotation = jest.fn(() => ({ items: [] }));

    const { handler } = makeHarness({
      connection: {
        source: { url: { value: SOURCE_URL }, cardId: null },
        target: {
          url: null,
          cardId: { getStringValue: () => ANNOTATION_CARD_ID },
        },
        curatorId: CuratorId.create(CURATOR).unwrap(),
      },
      getLibrariesForUrl: () => ({ items: [] }),
      getLibrariesForAnnotation,
    });

    await handler.handle(makeEvent('conn-annot-3'));

    expect(getLibrariesForAnnotation).toHaveBeenCalledWith(
      SOURCE_URL,
      PASSAGE,
      expect.anything(),
    );
  });
});
