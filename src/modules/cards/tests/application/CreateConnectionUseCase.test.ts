import { CreateConnectionUseCase } from '../../application/useCases/commands/CreateConnectionUseCase';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { FakeConnectionPublisher } from '../utils/FakeConnectionPublisher';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { FakeMetadataService } from '../utils/FakeMetadataService';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';
import { UrlOrCardIdType } from '../../domain/value-objects/UrlOrCardId';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { URL } from '../../domain/value-objects/URL';
import { CardTypeEnum } from '../../domain/value-objects/CardType';

const CURATOR = 'did:plc:testcurator123456789';
const OTHER_CURATOR = 'did:plc:othercurator98765432';
const URL_A = 'https://example.com/a';
const URL_B = 'https://example.com/b';

describe('CreateConnectionUseCase', () => {
  let useCase: CreateConnectionUseCase;
  let connectionRepository: InMemoryConnectionRepository;
  let cardRepository: InMemoryCardRepository;
  let connectionPublisher: FakeConnectionPublisher;
  let metadataService: FakeMetadataService;
  let eventPublisher: FakeEventPublisher;

  beforeEach(() => {
    connectionRepository = InMemoryConnectionRepository.getInstance();
    connectionRepository.clear();
    cardRepository = InMemoryCardRepository.getInstance();
    cardRepository.clear();
    connectionPublisher = new FakeConnectionPublisher();
    metadataService = new FakeMetadataService();
    eventPublisher = new FakeEventPublisher();

    useCase = new CreateConnectionUseCase(
      connectionRepository,
      cardRepository,
      connectionPublisher,
      metadataService,
      eventPublisher,
    );
  });

  const create = (
    overrides: Partial<Parameters<typeof useCase.execute>[0]> = {},
  ) =>
    useCase.execute({
      sourceType: UrlOrCardIdType.URL,
      sourceValue: URL_A,
      targetType: UrlOrCardIdType.URL,
      targetValue: URL_B,
      curatorId: CURATOR,
      ...overrides,
    });

  describe('default connection type', () => {
    it('defaults to RELATED when no connection type is provided', async () => {
      const result = await create();

      expect(result.isOk()).toBe(true);
      const stored = connectionRepository.getAllConnections();
      expect(stored).toHaveLength(1);
      expect(stored[0]!.type?.value).toBe(ConnectionTypeEnum.RELATED);
    });

    it('uses the provided connection type when given', async () => {
      await create({ connectionType: ConnectionTypeEnum.SUPPORTS });

      const stored = connectionRepository.getAllConnections();
      expect(stored[0]!.type?.value).toBe(ConnectionTypeEnum.SUPPORTS);
    });
  });

  describe('re-asserting a fully identical connection', () => {
    it('returns the existing connection instead of creating a duplicate', async () => {
      const first = await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'solid evidence',
      });
      const second = await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'solid evidence',
      });

      expect(second.unwrap().connectionId).toBe(first.unwrap().connectionId);
      expect(connectionRepository.getAllConnections()).toHaveLength(1);
    });

    it('dedupes identical calls that carry no note at all', async () => {
      const first = await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
      });
      const second = await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
      });

      expect(second.unwrap().connectionId).toBe(first.unwrap().connectionId);
      expect(connectionRepository.getAllConnections()).toHaveLength(1);
    });

    it('dedupes untyped repeat calls via the RELATED default', async () => {
      const first = await create();
      const second = await create();

      expect(second.unwrap().connectionId).toBe(first.unwrap().connectionId);
      expect(connectionRepository.getAllConnections()).toHaveLength(1);
    });

    it('leaves the existing connection untouched and does not republish', async () => {
      await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'solid evidence',
      });
      const publishedAfterCreate =
        connectionPublisher.getPublishedConnections().length;

      await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'solid evidence',
      });

      // Exact match is a no-op - nothing changed, so nothing is republished
      expect(connectionPublisher.getPublishedConnections()).toHaveLength(
        publishedAfterCreate,
      );
      const stored = connectionRepository.getAllConnections()[0]!;
      expect(stored.note?.value).toBe('solid evidence');
      expect(stored.type?.value).toBe(ConnectionTypeEnum.SUPPORTS);
    });
  });

  describe('anything different creates a new connection', () => {
    it('creates a new connection when the note differs', async () => {
      await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'solid evidence',
      });
      await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'a different reading',
      });

      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('creates a new connection when a note is added to a note-less one', async () => {
      await create({ connectionType: ConnectionTypeEnum.SUPPORTS });
      await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'now with a note',
      });

      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('creates a new connection when the note is dropped', async () => {
      await create({
        connectionType: ConnectionTypeEnum.SUPPORTS,
        note: 'solid evidence',
      });
      await create({ connectionType: ConnectionTypeEnum.SUPPORTS });

      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('keeps the reverse direction as its own connection', async () => {
      await create({ connectionType: ConnectionTypeEnum.SUPPORTS });
      await create({
        sourceValue: URL_B,
        targetValue: URL_A,
        connectionType: ConnectionTypeEnum.SUPPORTS,
      });

      // "A supports B" and "B supports A" are different claims
      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('keeps a different connection type as its own connection', async () => {
      await create({ connectionType: ConnectionTypeEnum.SUPPORTS });
      await create({ connectionType: ConnectionTypeEnum.OPPOSES });

      // A source can both support and undercut the same target
      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('does not collapse connections belonging to different curators', async () => {
      await create({ connectionType: ConnectionTypeEnum.SUPPORTS });
      await create({
        curatorId: OTHER_CURATOR,
        connectionType: ConnectionTypeEnum.SUPPORTS,
      });

      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('does not collapse connections between different URL pairs', async () => {
      await create();
      await create({ targetValue: 'https://example.com/c' });

      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });

    it('does not dedupe firehose events, which carry their own record URIs', async () => {
      await create({
        publishedRecordId: PublishedRecordId.create({
          uri: `at://${CURATOR}/network.cosmik.connection/rec1`,
          cid: 'cid1',
        }),
      });
      await create({
        publishedRecordId: PublishedRecordId.create({
          uri: `at://${CURATOR}/network.cosmik.connection/rec2`,
          cid: 'cid2',
        }),
      });

      expect(connectionRepository.getAllConnections()).toHaveLength(2);
    });
  });

  describe('CARD endpoints', () => {
    const createAnnotationCard = async (): Promise<string> => {
      const card = new CardBuilder()
        .withCuratorId(CURATOR)
        .withAnnotationCard(URL.create(URL_A).unwrap(), [
          { exact: 'the quoted passage' },
        ])
        .build();
      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }
      card.addToLibrary(CuratorId.create(CURATOR).unwrap());
      await cardRepository.save(card);
      return card.cardId.getStringValue();
    };

    it('creates a connection from an existing annotation card to a URL', async () => {
      const cardId = await createAnnotationCard();

      const result = await create({
        sourceType: UrlOrCardIdType.CARD,
        sourceValue: cardId,
      });

      expect(result.isOk()).toBe(true);
      const stored = connectionRepository.getAllConnections();
      expect(stored).toHaveLength(1);
      expect(stored[0]!.source.stringValue).toBe(cardId);
    });

    it('stores URL metadata on both sides of a card↔URL connection', async () => {
      // The card anchors to URL_A; the other endpoint is URL_B
      const cardId = await createAnnotationCard();

      const result = await create({
        sourceType: UrlOrCardIdType.CARD,
        sourceValue: cardId,
        targetType: UrlOrCardIdType.URL,
        targetValue: URL_B,
      });

      expect(result.isOk()).toBe(true);
      const stored = connectionRepository.getAllConnections();
      expect(stored).toHaveLength(1);
      // The CARD side carries its anchor URL's metadata, the URL side its
      // own — like a URL↔URL connection
      expect(stored[0]!.sourceUrlMetadata?.url).toBe(URL_A);
      expect(stored[0]!.targetUrlMetadata?.url).toBe(URL_B);
    });

    it('rejects a CARD endpoint that does not reference an existing card', async () => {
      const result = await create({
        sourceType: UrlOrCardIdType.CARD,
        sourceValue: 'bogus-card-id',
      });

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        'Source card not found',
      );
      expect(connectionRepository.getAllConnections()).toHaveLength(0);
    });

    it('checks the target endpoint too', async () => {
      const result = await create({
        targetType: UrlOrCardIdType.CARD,
        targetValue: 'bogus-card-id',
      });

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain(
        'Target card not found',
      );
    });

    it('skips the existence check for firehose-mirrored records', async () => {
      const result = await create({
        sourceType: UrlOrCardIdType.CARD,
        sourceValue: 'at://did:plc:someone/at.margin.note/late-arrival',
        publishedRecordId: PublishedRecordId.create({
          uri: `at://${CURATOR}/network.cosmik.connection/rec3`,
          cid: 'cid3',
        }),
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
