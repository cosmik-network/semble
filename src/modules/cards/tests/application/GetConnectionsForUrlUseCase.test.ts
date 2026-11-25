import { GetConnectionsForUrlUseCase } from '../../application/useCases/queries/GetConnectionsForUrlUseCase';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { InMemoryConnectionQueryRepository } from '../utils/InMemoryConnectionQueryRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { Connection } from '../../domain/Connection';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { ConnectionType } from '../../domain/value-objects/ConnectionType';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { URL } from '../../domain/value-objects/URL';
import { CardId } from '../../domain/value-objects/CardId';
import type { Card } from '../../domain/Card';

describe('GetConnectionsForUrlUseCase', () => {
  const PAGE_URL = 'https://example.com/annotated-article';
  const OTHER_URL = 'https://example.com/other-article';

  let useCase: GetConnectionsForUrlUseCase;
  let connectionRepository: InMemoryConnectionRepository;
  let connectionQueryRepository: InMemoryConnectionQueryRepository;
  let cardRepository: InMemoryCardRepository;
  let cardQueryRepository: InMemoryCardQueryRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let profileService: FakeProfileService;
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
    // The card repository lets CARD endpoints resolve to their URL
    connectionQueryRepository = new InMemoryConnectionQueryRepository(
      connectionRepository,
    );
    cardQueryRepository = new InMemoryCardQueryRepository(
      cardRepository,
      collectionRepository,
    );
    profileService = new FakeProfileService();

    useCase = new GetConnectionsForUrlUseCase(
      connectionQueryRepository,
      cardQueryRepository,
      profileService,
    );

    curator = CuratorId.create('did:plc:curator').unwrap();

    profileService.addProfile({
      id: curator.value,
      name: 'Curator',
      handle: 'curator',
    });
  });

  afterEach(() => {
    connectionRepository.clear();
    cardRepository.clear();
    collectionRepository.clear();
    profileService.clear();
  });

  it('returns URL-to-URL connections with URL endpoints', async () => {
    await saveUrlCard(PAGE_URL);
    await saveUrlCard(OTHER_URL);

    const connection = Connection.create({
      source: UrlOrCardId.createFromUrl(URL.create(PAGE_URL).unwrap()).unwrap(),
      target: UrlOrCardId.createFromUrl(
        URL.create(OTHER_URL).unwrap(),
      ).unwrap(),
      type: ConnectionType.create(ConnectionTypeEnum.SUPPORTS).unwrap(),
      curatorId: curator,
    }).unwrap();
    await connectionRepository.save(connection);

    const result = await useCase.execute({ url: PAGE_URL });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.connections).toHaveLength(1);
    const conn = response.connections[0]!;
    expect(conn.source.type).toBe('URL');
    expect(conn.target.type).toBe('URL');
    expect(conn.connection.curator.handle).toBe('curator');
  });

  it('returns a CARD endpoint for the other URL, but does not match the annotation URL', async () => {
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

    // The annotation anchors to PAGE_URL, but the URL query matches URL
    // endpoints only — the passage's own connections come from
    // connectionsForAnnotation, not here
    const onAnnotationPage = await useCase.execute({
      url: PAGE_URL,
      direction: 'both',
    });
    expect(onAnnotationPage.isOk()).toBe(true);
    expect(onAnnotationPage.unwrap().connections).toHaveLength(0);

    // OTHER_URL is the target, so the connection surfaces there — with the
    // CARD endpoint in the payload
    const onOtherUrl = await useCase.execute({
      url: OTHER_URL,
      direction: 'backward',
    });
    expect(onOtherUrl.isOk()).toBe(true);
    const response = onOtherUrl.unwrap();
    expect(response.connections).toHaveLength(1);
    const conn = response.connections[0]!;
    expect(conn.source.type).toBe('CARD');
    expect(conn.target.type).toBe('URL');
    if (conn.source.type === 'CARD') {
      expect(conn.source.card.id).toBe(annotationCard.cardId.getStringValue());
      expect(conn.source.card.url).toBe(PAGE_URL);
      expect(conn.source.card.author.handle).toBe('curator');
    }
  });

  it('skips connections whose other-endpoint card no longer resolves', async () => {
    await saveUrlCard(PAGE_URL);

    // Reference a card id that was never saved
    const bogusCardId = CardId.createFromString(
      'b3e1b8a4-5c32-4d87-9f6a-1a2b3c4d5e6f',
    ).unwrap();
    const connection = Connection.create({
      source: UrlOrCardId.createFromUrl(URL.create(PAGE_URL).unwrap()).unwrap(),
      target: UrlOrCardId.createFromCard(bogusCardId).unwrap(),
      curatorId: curator,
    }).unwrap();
    await connectionRepository.save(connection);

    const result = await useCase.execute({ url: PAGE_URL });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().connections).toHaveLength(0);
  });

  it('counts card connections in curator stats', async () => {
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

    const stats = await connectionQueryRepository.getConnectionStatsForCurator(
      curator.value,
    );

    expect(stats.total).toBe(1);
    expect(stats.byType.get(ConnectionTypeEnum.RELATED)).toBe(1);
  });
});
