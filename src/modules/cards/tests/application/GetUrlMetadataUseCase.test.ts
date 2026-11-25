import { GetUrlMetadataUseCase } from '../../application/useCases/queries/GetUrlMetadataUseCase';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeMetadataService } from '../utils/FakeMetadataService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { Connection } from '../../domain/Connection';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { ConnectionType } from '../../domain/value-objects/ConnectionType';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { URL } from '../../domain/value-objects/URL';
import type { Card } from '../../domain/Card';

describe('GetUrlMetadataUseCase stats', () => {
  const PAGE_URL = 'https://example.com/annotated-article';
  const OTHER_URL = 'https://example.com/other-article';

  let useCase: GetUrlMetadataUseCase;
  let connectionRepository: InMemoryConnectionRepository;
  let cardRepository: InMemoryCardRepository;
  let cardQueryRepository: InMemoryCardQueryRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let metadataService: FakeMetadataService;
  let curator: CuratorId;

  const saveUrlCard = async (url: string): Promise<void> => {
    const card = new CardBuilder()
      .withCuratorId(curator.value)
      .withType(CardTypeEnum.URL)
      .withUrl(URL.create(url).unwrap())
      .build();
    if (card instanceof Error) {
      throw new Error(`Failed to create card for ${url}`);
    }
    card.addToLibrary(curator);
    await cardRepository.save(card);
  };

  const saveAnnotationCard = async (
    url: string,
    exact: string,
  ): Promise<Card> => {
    const card = new CardBuilder()
      .withCuratorId(curator.value)
      .withAnnotationCard(URL.create(url).unwrap(), [{ exact }])
      .build();
    if (card instanceof Error) {
      throw new Error(`Failed to create annotation card: ${card.message}`);
    }
    card.addToLibrary(curator);
    await cardRepository.save(card);
    return card;
  };

  beforeEach(() => {
    connectionRepository = InMemoryConnectionRepository.getInstance();
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardQueryRepository = new InMemoryCardQueryRepository(
      cardRepository,
      collectionRepository,
      connectionRepository,
    );
    metadataService = new FakeMetadataService();

    useCase = new GetUrlMetadataUseCase(metadataService, cardQueryRepository);

    curator = CuratorId.create('did:plc:curator').unwrap();
  });

  afterEach(() => {
    connectionRepository.clear();
    cardRepository.clear();
    collectionRepository.clear();
  });

  it('counts URL↔CARD connections in the URL stats and connect state', async () => {
    const annotationCard = await saveAnnotationCard(PAGE_URL, 'the passage');
    await saveUrlCard(OTHER_URL);

    // A passage connecting to OTHER_URL — OTHER_URL is the target endpoint
    const connection = Connection.create({
      source: UrlOrCardId.createFromCard(annotationCard.cardId).unwrap(),
      target: UrlOrCardId.createFromUrl(
        URL.create(OTHER_URL).unwrap(),
      ).unwrap(),
      type: ConnectionType.create(ConnectionTypeEnum.RELATED).unwrap(),
      curatorId: curator,
    }).unwrap();
    await connectionRepository.save(connection);

    const result = await useCase.execute({
      url: OTHER_URL,
      includeStats: true,
      callingUserId: curator.value,
    });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    // The connection surfaces on OTHER_URL's page, so its counts include it
    expect(response.stats?.connections.all.total).toBe(1);
    expect(response.stats?.connections.incoming.total).toBe(1);
    expect(response.stats?.connections.outgoing.total).toBe(0);
    // The curator connected OTHER_URL (to a passage), so the connect state
    // reflects that even though the connection is not URL↔URL
    expect(response.urlIsConnected).toBe(true);
  });

  it('does not count a passage own connections on its anchor URL', async () => {
    const annotationCard = await saveAnnotationCard(PAGE_URL, 'the passage');
    await saveUrlCard(OTHER_URL);

    const connection = Connection.create({
      source: UrlOrCardId.createFromCard(annotationCard.cardId).unwrap(),
      target: UrlOrCardId.createFromUrl(
        URL.create(OTHER_URL).unwrap(),
      ).unwrap(),
      type: ConnectionType.create(ConnectionTypeEnum.RELATED).unwrap(),
      curatorId: curator,
    }).unwrap();
    await connectionRepository.save(connection);

    // The passage anchors to PAGE_URL, but PAGE_URL is not an endpoint of the
    // connection — its own connections are counted on the annotation
    const result = await useCase.execute({
      url: PAGE_URL,
      includeStats: true,
      callingUserId: curator.value,
    });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.stats?.connections.all.total).toBe(0);
    expect(response.urlIsConnected).toBe(false);
  });

  it('counts URL and annotation cards in profile card stats', async () => {
    await saveUrlCard(OTHER_URL);
    await saveAnnotationCard(PAGE_URL, 'the passage');

    const stats = await cardQueryRepository.getProfileCardStats(curator.value);

    // The profile Cards tab lists URL + annotation cards; NOTE cards are
    // excluded
    expect(stats.urlCardCount).toBe(1);
    expect(stats.annotationCardCount).toBe(1);
  });

  it('includes the annotation count in the URL stats', async () => {
    await saveUrlCard(PAGE_URL);
    await saveAnnotationCard(PAGE_URL, 'the passage');
    await saveAnnotationCard(PAGE_URL, 'another passage');

    const result = await useCase.execute({
      url: PAGE_URL,
      includeStats: true,
    });

    expect(result.isOk()).toBe(true);
    // Annotation cards made on the URL — what its Annotations tab lists
    expect(result.unwrap().stats?.annotationCount).toBe(2);

    const otherResult = await useCase.execute({
      url: OTHER_URL,
      includeStats: true,
    });
    expect(otherResult.unwrap().stats?.annotationCount).toBe(0);
  });
});
