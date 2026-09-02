import { BullMQEventPublisher } from '../BullMQEventPublisher';
import { EventNames } from '../EventConfig';
import { QueueNames } from '../QueueConfig';

describe('BullMQEventPublisher queue routing', () => {
  const publisher = new BullMQEventPublisher({} as any);
  const targetQueues = (eventName: string) =>
    (publisher as any).getTargetQueues(eventName);

  it.each([
    EventNames.COLLECTION_CREATED,
    EventNames.COLLECTION_UPDATED,
    EventNames.NOTE_CARD_UPDATED,
    EventNames.CONNECTION_UPDATED,
  ])('routes %s to the notifications queue', (eventName) => {
    expect(targetQueues(eventName)).toContain(QueueNames.NOTIFICATIONS);
  });
});
