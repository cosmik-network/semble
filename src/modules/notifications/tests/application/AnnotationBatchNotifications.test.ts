import { NotificationService } from '../../domain/services/NotificationService';
import { Notification } from '../../domain/Notification';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { ok } from '../../../../shared/core/Result';

const RECIPIENT = 'did:plc:recipient';
const ACTOR = 'did:plc:actor';
const URL = 'https://example.com/page';
const WINDOW_MS = 20 * 60 * 1000;

function makeCardId(rkey: string) {
  return CardId.createFromString(rkey).unwrap();
}

describe('NotificationService USER_ANNOTATED_YOUR_URL batching', () => {
  it('creates a new batch when none is recent, then appends to it within the window', async () => {
    const saved: Notification[] = [];
    let existing: Notification[] = [];

    const repository = {
      save: jest.fn(async (notification: Notification) => {
        saved.push(notification);
        return ok(undefined);
      }),
      findByRecipientAndActorSince: jest.fn(async () => ok(existing)),
    } as any;

    const service = new NotificationService(repository);
    const recipient = CuratorId.create(RECIPIENT).unwrap();
    const actor = CuratorId.create(ACTOR).unwrap();

    const first = await service.createOrAppendUserAnnotatedYourUrlNotification(
      recipient,
      actor,
      URL,
      makeCardId('44444444-4444-4444-8444-444444444444'),
      WINDOW_MS,
    );
    expect(first.isOk()).toBe(true);
    expect(saved).toHaveLength(1);
    expect((first.unwrap().metadata as any).annotationIds).toHaveLength(1);

    // Simulate the created batch being findable on the next call
    existing = [first.unwrap()];

    const second = await service.createOrAppendUserAnnotatedYourUrlNotification(
      recipient,
      actor,
      URL,
      makeCardId('55555555-5555-4555-8555-555555555555'),
      WINDOW_MS,
    );
    expect(second.isOk()).toBe(true);
    // Appended, not duplicated: same notification, two annotation ids
    expect(saved).toHaveLength(2);
    expect(
      second.unwrap().notificationId.equals(first.unwrap().notificationId),
    ).toBe(true);
    expect((second.unwrap().metadata as any).annotationIds).toHaveLength(2);

    // Appending the same card again is a no-op
    const third = await service.createOrAppendUserAnnotatedYourUrlNotification(
      recipient,
      actor,
      URL,
      makeCardId('55555555-5555-4555-8555-555555555555'),
      WINDOW_MS,
    );
    expect(third.isOk()).toBe(true);
    expect((third.unwrap().metadata as any).annotationIds).toHaveLength(2);
  });

  it('does not append across a different url', async () => {
    const otherUrlBatch = Notification.createUserAnnotatedYourUrl(
      CuratorId.create(RECIPIENT).unwrap(),
      CuratorId.create(ACTOR).unwrap(),
      'https://example.com/other',
      ['66666666-6666-4666-8666-666666666666'],
    ).unwrap();

    const saved: Notification[] = [];
    const repository = {
      save: jest.fn(async (notification: Notification) => {
        saved.push(notification);
        return ok(undefined);
      }),
      findByRecipientAndActorSince: jest.fn(async () => ok([otherUrlBatch])),
    } as any;

    const service = new NotificationService(repository);
    const result = await service.createOrAppendUserAnnotatedYourUrlNotification(
      CuratorId.create(RECIPIENT).unwrap(),
      CuratorId.create(ACTOR).unwrap(),
      URL,
      makeCardId('44444444-4444-4444-8444-444444444444'),
      WINDOW_MS,
    );

    expect(result.isOk()).toBe(true);
    // Different url → new notification, other batch untouched
    expect((otherUrlBatch.metadata as any).annotationIds).toHaveLength(1);
    expect((result.unwrap().metadata as any).annotationIds).toHaveLength(1);
    expect(
      result.unwrap().notificationId.equals(otherUrlBatch.notificationId),
    ).toBe(false);
  });

  it('never notifies a user about their own annotation', async () => {
    const repository = {
      save: jest.fn(),
      findByRecipientAndActorSince: jest.fn(async () => ok([])),
    } as any;

    const service = new NotificationService(repository);
    const did = CuratorId.create(ACTOR).unwrap();
    const result = await service.createOrAppendUserAnnotatedYourUrlNotification(
      did,
      did,
      URL,
      makeCardId('44444444-4444-4444-8444-444444444444'),
      WINDOW_MS,
    );

    expect(result.isErr()).toBe(true);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
