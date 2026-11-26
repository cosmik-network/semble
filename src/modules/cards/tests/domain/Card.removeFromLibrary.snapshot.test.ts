import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { URL } from '../../domain/value-objects/URL';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardRemovedFromLibraryEvent } from '../../domain/events/CardRemovedFromLibraryEvent';
import { Card } from '../../domain/Card';

describe('Card.removeFromLibrary event snapshot', () => {
  const url = URL.create('https://example.com/paper').unwrap();
  const curator = CuratorId.create('did:plc:testcurator').unwrap();

  it('carries the annotation passage key for annotation cards', () => {
    const card = new CardBuilder()
      .withCuratorId('did:plc:testcurator')
      .withAnnotationCard(url, [
        { exact: 'The   committee found no evidence.' },
      ])
      .build();
    if (card instanceof Error) {
      throw card;
    }

    card.addToLibrary(curator).unwrap();
    card.clearEvents();

    card.removeFromLibrary(curator).unwrap();

    const events = card.domainEvents.filter(
      (e) => e instanceof CardRemovedFromLibraryEvent,
    ) as CardRemovedFromLibraryEvent[];
    expect(events).toHaveLength(1);
    expect(events[0]!.removedCard).toEqual({
      cardType: CardTypeEnum.ANNOTATION,
      url: url.value,
      exactNormalized: ['The committee found no evidence.'],
    });
  });

  it('carries cardType and url without passage keys for URL cards', () => {
    const card = new CardBuilder()
      .withCuratorId('did:plc:testcurator')
      .withUrlCard(url)
      .build();
    if (card instanceof Error) {
      throw card;
    }

    card.addToLibrary(curator).unwrap();
    card.clearEvents();

    card.removeFromLibrary(curator).unwrap();

    const events = card.domainEvents.filter(
      (e) => e instanceof CardRemovedFromLibraryEvent,
    ) as CardRemovedFromLibraryEvent[];
    expect(events).toHaveLength(1);
    expect(events[0]!.removedCard).toEqual({
      cardType: CardTypeEnum.URL,
      url: url.value,
    });
  });
});
