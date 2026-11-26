import { CardAddedToLibraryEventHandler } from '../../application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { ok, err } from '../../../../shared/core/Result';

const CARD_ID = '33333333-3333-4333-8333-333333333333';
const PAGE_URL = 'https://example.com/page';
const EXACT = 'The committee found no evidence of collusion.';
const EXACT_NORMALIZED = 'the committee found no evidence of collusion';

function makeEvent() {
  return CardAddedToLibraryEvent.create(
    CardId.createFromString(CARD_ID).unwrap(),
    CuratorId.create('did:plc:actor').unwrap(),
    new Date(),
  ).unwrap();
}

function makeFakeAnnotationCard(props?: { selector?: boolean }) {
  return {
    isUrlCard: false,
    isAnnotationCard: true,
    url: { value: PAGE_URL },
    content: {
      annotationContent: props?.selector
        ? {
            textQuoteSelector: {
              exact: EXACT,
              normalizedExact: EXACT_NORMALIZED,
            },
          }
        : { textQuoteSelector: undefined },
    },
  } as any;
}

function makeHandler(card: any) {
  const indexUrlForSearchUseCase = {
    execute: jest.fn(async () => ok({ indexed: true })),
  } as any;
  const indexAnnotationForSearchUseCase = {
    execute: jest.fn(async () => ok({ indexed: true })),
  } as any;

  const handler = new CardAddedToLibraryEventHandler(
    indexUrlForSearchUseCase,
    { findById: jest.fn(async () => ok(card)) } as any,
    indexAnnotationForSearchUseCase,
  );

  return { handler, indexUrlForSearchUseCase, indexAnnotationForSearchUseCase };
}

describe('SearchCardAddedToLibraryEventHandler — annotations', () => {
  it('indexes the annotation passage via the annotation use case', async () => {
    const {
      handler,
      indexAnnotationForSearchUseCase,
      indexUrlForSearchUseCase,
    } = makeHandler(makeFakeAnnotationCard({ selector: true }));

    const result = await handler.handle(makeEvent());

    expect(result.isOk()).toBe(true);
    expect(indexUrlForSearchUseCase.execute).not.toHaveBeenCalled();
    expect(indexAnnotationForSearchUseCase.execute).toHaveBeenCalledWith({
      url: PAGE_URL,
      exact: EXACT,
      exactNormalized: EXACT_NORMALIZED,
    });
  });

  it('is a no-op for annotation cards without a TextQuoteSelector', async () => {
    const { handler, indexAnnotationForSearchUseCase } = makeHandler(
      makeFakeAnnotationCard({ selector: false }),
    );

    await handler.handle(makeEvent());

    expect(indexAnnotationForSearchUseCase.execute).not.toHaveBeenCalled();
  });

  it('still indexes URL cards through the URL use case', async () => {
    const urlCard = {
      isUrlCard: true,
      isAnnotationCard: false,
      url: { value: PAGE_URL },
    } as any;
    const {
      handler,
      indexUrlForSearchUseCase,
      indexAnnotationForSearchUseCase,
    } = makeHandler(urlCard);

    await handler.handle(makeEvent());

    expect(indexUrlForSearchUseCase.execute).toHaveBeenCalledWith({
      url: PAGE_URL,
    });
    expect(indexAnnotationForSearchUseCase.execute).not.toHaveBeenCalled();
  });

  it('never fails event processing when indexing errors', async () => {
    const { handler, indexAnnotationForSearchUseCase } = makeHandler(
      makeFakeAnnotationCard({ selector: true }),
    );
    (indexAnnotationForSearchUseCase.execute as jest.Mock).mockResolvedValue(
      err(new Error('vector db down')),
    );

    const result = await handler.handle(makeEvent());

    expect(result.isOk()).toBe(true);
  });
});
