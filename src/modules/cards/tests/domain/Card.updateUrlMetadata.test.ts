import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { URL } from '../../domain/value-objects/URL';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../domain/value-objects/UrlType';
import { UrlCardMetadataUpdatedEvent } from '../../domain/events/UrlCardMetadataUpdatedEvent';
import { Card, CARD_ERROR_MESSAGES } from '../../domain/Card';

describe('Card.updateUrlMetadata', () => {
  const url = URL.create('https://example.com/paper').unwrap();

  const buildUrlCard = (metadata?: UrlMetadata): Card => {
    const card = new CardBuilder()
      .withCuratorId('did:plc:testcurator')
      .withUrlCard(url, metadata)
      .build();
    if (card instanceof Error) {
      throw card;
    }
    return card;
  };

  it('replaces the metadata and raises UrlCardMetadataUpdatedEvent', () => {
    const initial = UrlMetadata.create({
      url: url.value,
      title: 'Fast title',
      type: UrlType.LINK,
    }).unwrap();
    const card = buildUrlCard(initial);
    card.clearEvents();

    const enriched = UrlMetadata.create({
      url: url.value,
      title: 'Fast title',
      description: 'Slow description',
      type: UrlType.RESEARCH,
    }).unwrap();

    const result = card.updateUrlMetadata(enriched);

    expect(result.isOk()).toBe(true);
    expect(card.content.urlContent?.metadata?.type).toBe(UrlType.RESEARCH);
    expect(card.content.urlContent?.metadata?.description).toBe(
      'Slow description',
    );
    expect(card.content.urlContent?.url.value).toBe(url.value);

    const events = card.domainEvents.filter(
      (e) => e instanceof UrlCardMetadataUpdatedEvent,
    ) as UrlCardMetadataUpdatedEvent[];
    expect(events).toHaveLength(1);
    expect(events[0]!.cardId.equals(card.cardId)).toBe(true);
    expect(events[0]!.curatorId.equals(card.curatorId)).toBe(true);
    expect(events[0]!.url).toBe(url.value);
  });

  it('rejects metadata updates on non-URL cards', () => {
    const noteCard = new CardBuilder()
      .withCuratorId('did:plc:testcurator')
      .withType(CardTypeEnum.NOTE)
      .build();
    if (noteCard instanceof Error) {
      throw noteCard;
    }

    const metadata = UrlMetadata.create({ url: url.value }).unwrap();
    const result = noteCard.updateUrlMetadata(metadata);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        CARD_ERROR_MESSAGES.METADATA_UPDATE_URL_CARD_ONLY,
      );
    }
    expect(noteCard.domainEvents).toHaveLength(0);
  });
});
