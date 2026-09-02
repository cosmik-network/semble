import { UpdateUrlCardMetadataUseCase } from '../../application/useCases/commands/UpdateUrlCardMetadataUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { URL } from '../../domain/value-objects/URL';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../domain/value-objects/UrlType';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { Card } from '../../domain/Card';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';

describe('UpdateUrlCardMetadataUseCase', () => {
  let useCase: UpdateUrlCardMetadataUseCase;
  let cardRepository: InMemoryCardRepository;
  let cardPublisher: FakeCardPublisher;
  let eventPublisher: FakeEventPublisher;
  let curatorId: CuratorId;

  const url = URL.create('https://example.com/paper').unwrap();

  const enrichedMetadata = UrlMetadata.create({
    url: url.value,
    title: 'Enriched title',
    description: 'Enriched description',
    type: UrlType.RESEARCH,
  }).unwrap();

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    eventPublisher = new FakeEventPublisher();
    useCase = new UpdateUrlCardMetadataUseCase(
      cardRepository,
      cardPublisher,
      eventPublisher,
    );
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    cardPublisher.clear();
    eventPublisher.clear();
  });

  const createSavedUrlCard = async (publishedUri?: string): Promise<Card> => {
    const initialMetadata = UrlMetadata.create({
      url: url.value,
      title: 'Fast title',
      type: UrlType.LINK,
    }).unwrap();

    const card = new CardBuilder()
      .withCuratorId(curatorId.value)
      .withUrlCard(url, initialMetadata)
      .build();
    if (card instanceof Error) {
      throw card;
    }

    const addResult = card.addToLibrary(curatorId);
    if (addResult.isErr()) {
      throw addResult.error;
    }

    if (publishedUri) {
      card.markCardInLibraryAsPublished(
        curatorId,
        PublishedRecordId.create({ uri: publishedUri, cid: 'original-cid' }),
      );
    }

    card.clearEvents();
    await cardRepository.save(card);
    return card;
  };

  it('updates metadata, republishes to the PDS, and publishes the event', async () => {
    const card = await createSavedUrlCard(
      `at://${curatorId.value}/network.cosmik.card/rkey123`,
    );

    const result = await useCase.execute({
      cardId: card.cardId.getStringValue(),
      metadata: enrichedMetadata,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().republishedToPds).toBe(true);

    const savedCard = (
      await cardRepository.findById(card.cardId)
    ).unwrap() as Card;
    expect(savedCard.content.urlContent?.metadata?.type).toBe(UrlType.RESEARCH);
    expect(savedCard.content.urlContent?.metadata?.description).toBe(
      'Enriched description',
    );

    const events = eventPublisher.getPublishedEventsOfType(
      EventNames.URL_CARD_METADATA_UPDATED,
    );
    expect(events).toHaveLength(1);
  });

  it('still updates the DB and publishes the event when the PDS republish fails', async () => {
    const card = await createSavedUrlCard(
      `at://${curatorId.value}/network.cosmik.card/rkey123`,
    );
    cardPublisher.setShouldFail(true);

    const result = await useCase.execute({
      cardId: card.cardId.getStringValue(),
      metadata: enrichedMetadata,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().republishedToPds).toBe(false);

    const savedCard = (
      await cardRepository.findById(card.cardId)
    ).unwrap() as Card;
    expect(savedCard.content.urlContent?.metadata?.type).toBe(UrlType.RESEARCH);

    const events = eventPublisher.getPublishedEventsOfType(
      EventNames.URL_CARD_METADATA_UPDATED,
    );
    expect(events).toHaveLength(1);
  });

  it('skips the PDS for cards that were never published', async () => {
    const card = await createSavedUrlCard();

    const result = await useCase.execute({
      cardId: card.cardId.getStringValue(),
      metadata: enrichedMetadata,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().republishedToPds).toBe(false);
  });

  it('skips the PDS for firehose-mirrored Margin records', async () => {
    const card = await createSavedUrlCard(
      `at://${curatorId.value}/at.margin.bookmark/rkey123`,
    );

    const result = await useCase.execute({
      cardId: card.cardId.getStringValue(),
      metadata: enrichedMetadata,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().republishedToPds).toBe(false);
    // Metadata still updated in the DB
    const savedCard = (
      await cardRepository.findById(card.cardId)
    ).unwrap() as Card;
    expect(savedCard.content.urlContent?.metadata?.type).toBe(UrlType.RESEARCH);
  });

  it('rejects non-URL cards', async () => {
    const noteCard = new CardBuilder()
      .withCuratorId(curatorId.value)
      .withType(CardTypeEnum.NOTE)
      .build();
    if (noteCard instanceof Error) {
      throw noteCard;
    }
    await cardRepository.save(noteCard);

    const result = await useCase.execute({
      cardId: noteCard.cardId.getStringValue(),
      metadata: enrichedMetadata,
    });

    expect(result.isErr()).toBe(true);
  });
});
