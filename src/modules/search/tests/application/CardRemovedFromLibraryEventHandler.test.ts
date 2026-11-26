import { CardRemovedFromLibraryEventHandler } from '../../application/eventHandlers/CardRemovedFromLibraryEventHandler';
import {
  CardRemovedFromLibraryEvent,
  RemovedCardSnapshot,
} from '../../../cards/domain/events/CardRemovedFromLibraryEvent';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { ok, err } from '../../../../shared/core/Result';

const CARD_ID = '33333333-3333-4333-8333-333333333333';
const PAGE_URL = 'https://example.com/page';

function makeEvent(removedCard?: RemovedCardSnapshot) {
  return CardRemovedFromLibraryEvent.create(
    CardId.createFromString(CARD_ID).unwrap(),
    CuratorId.create('did:plc:actor').unwrap(),
    removedCard,
  ).unwrap();
}

describe('SearchCardRemovedFromLibraryEventHandler', () => {
  it('deletes the annotation passage vector via the use case', async () => {
    const deleteAnnotationFromSearchUseCase = {
      execute: jest.fn(async () => ok({ deleted: true })),
    } as any;
    const handler = new CardRemovedFromLibraryEventHandler(
      deleteAnnotationFromSearchUseCase,
    );

    const result = await handler.handle(
      makeEvent({
        cardType: CardTypeEnum.ANNOTATION,
        url: PAGE_URL,
        exactNormalized: ['the passage that was removed'],
      }),
    );

    expect(result.isOk()).toBe(true);
    expect(deleteAnnotationFromSearchUseCase.execute).toHaveBeenCalledWith({
      url: PAGE_URL,
      exactNormalized: 'the passage that was removed',
    });
  });

  it('is a no-op without a snapshot (legacy events)', async () => {
    const deleteAnnotationFromSearchUseCase = {
      execute: jest.fn(async () => ok({ deleted: true })),
    } as any;
    const handler = new CardRemovedFromLibraryEventHandler(
      deleteAnnotationFromSearchUseCase,
    );

    await handler.handle(makeEvent());

    expect(deleteAnnotationFromSearchUseCase.execute).not.toHaveBeenCalled();
  });

  it('is a no-op for non-annotation cards', async () => {
    const deleteAnnotationFromSearchUseCase = {
      execute: jest.fn(async () => ok({ deleted: true })),
    } as any;
    const handler = new CardRemovedFromLibraryEventHandler(
      deleteAnnotationFromSearchUseCase,
    );

    await handler.handle(
      makeEvent({ cardType: CardTypeEnum.URL, url: PAGE_URL }),
    );

    expect(deleteAnnotationFromSearchUseCase.execute).not.toHaveBeenCalled();
  });

  it('never fails event processing when deletion errors', async () => {
    const deleteAnnotationFromSearchUseCase = {
      execute: jest.fn(async () => err(new Error('vector db down'))),
    } as any;
    const handler = new CardRemovedFromLibraryEventHandler(
      deleteAnnotationFromSearchUseCase,
    );

    const result = await handler.handle(
      makeEvent({
        cardType: CardTypeEnum.ANNOTATION,
        url: PAGE_URL,
        exactNormalized: ['x'],
      }),
    );

    expect(result.isOk()).toBe(true);
  });
});
