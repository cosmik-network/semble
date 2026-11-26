import { EventMapper } from '../EventMapper';
import {
  CardRemovedFromLibraryEvent,
  RemovedCardSnapshot,
} from '../../../../modules/cards/domain/events/CardRemovedFromLibraryEvent';
import { CardId } from '../../../../modules/cards/domain/value-objects/CardId';
import { CuratorId } from '../../../../modules/cards/domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../../modules/cards/domain/value-objects/CardType';

describe('EventMapper — CardRemovedFromLibraryEvent snapshot round-trip', () => {
  it('preserves the removed-card snapshot through serialize/deserialize', () => {
    const removedCard: RemovedCardSnapshot = {
      cardType: CardTypeEnum.ANNOTATION,
      url: 'https://example.com/page',
      exactNormalized: ['the committee found no evidence'],
    };

    const event = CardRemovedFromLibraryEvent.create(
      CardId.createFromString('33333333-3333-4333-8333-333333333333').unwrap(),
      CuratorId.create('did:plc:actor').unwrap(),
      removedCard,
    ).unwrap();

    const serialized = EventMapper.toSerialized(event);
    expect(serialized).toMatchObject({
      eventType: 'CardRemovedFromLibraryEvent',
      removedCard: {
        cardType: 'ANNOTATION',
        url: 'https://example.com/page',
        exactNormalized: ['the committee found no evidence'],
      },
    });

    const deserialized = EventMapper.fromSerialized(
      serialized,
    ) as CardRemovedFromLibraryEvent;
    expect(deserialized.removedCard).toEqual(removedCard);
  });

  it('round-trips legacy events without a snapshot', () => {
    const event = CardRemovedFromLibraryEvent.create(
      CardId.createFromString('33333333-3333-4333-8333-333333333333').unwrap(),
      CuratorId.create('did:plc:actor').unwrap(),
    ).unwrap();

    const deserialized = EventMapper.fromSerialized(
      EventMapper.toSerialized(event),
    ) as CardRemovedFromLibraryEvent;

    expect(deserialized.removedCard).toBeUndefined();
  });
});
