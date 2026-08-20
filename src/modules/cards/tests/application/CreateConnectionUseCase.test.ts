import { CreateConnectionUseCase } from '../../application/useCases/commands/CreateConnectionUseCase';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { FakeConnectionPublisher } from '../utils/FakeConnectionPublisher';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { FakeMetadataService } from '../utils/FakeMetadataService';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';
import { UrlOrCardIdType } from '../../domain/value-objects/UrlOrCardId';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';

const CURATOR = 'did:plc:testcurator123456789';
const OTHER_CURATOR = 'did:plc:othercurator98765432';
const URL_A = 'https://example.com/a';
const URL_B = 'https://example.com/b';

describe('CreateConnectionUseCase', () => {
  let useCase: CreateConnectionUseCase;
  let connectionRepository: InMemoryConnectionRepository;
  let connectionPublisher: FakeConnectionPublisher;
  let metadataService: FakeMetadataService;
  let eventPublisher: FakeEventPublisher;

  beforeEach(() => {
    connectionRepository = InMemoryConnectionRepository.getInstance();
    connectionRepository.clear();
    connectionPublisher = new FakeConnectionPublisher();
    metadataService = new FakeMetadataService();
    eventPublisher = new FakeEventPublisher();

    useCase = new CreateConnectionUseCase(
      connectionRepository,
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
});
