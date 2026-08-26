import { UpdateConnectionUrlMetadataUseCase } from '../../application/useCases/commands/UpdateConnectionUrlMetadataUseCase';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { Connection } from '../../domain/Connection';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import {
  UrlOrCardId,
  UrlOrCardIdType,
} from '../../domain/value-objects/UrlOrCardId';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../domain/value-objects/UrlType';

const CURATOR = 'did:plc:testcurator123456789';
const URL_A = 'https://example.com/a';
const URL_B = 'https://example.com/b';

describe('UpdateConnectionUrlMetadataUseCase', () => {
  let useCase: UpdateConnectionUrlMetadataUseCase;
  let connectionRepository: InMemoryConnectionRepository;

  beforeEach(() => {
    connectionRepository = InMemoryConnectionRepository.getInstance();
    connectionRepository.clear();
    useCase = new UpdateConnectionUrlMetadataUseCase(connectionRepository);
  });

  const makeMetadata = (url: string, title: string, type?: UrlType) =>
    UrlMetadata.create({ url, title, type }).unwrap();

  const createSavedConnection = async (): Promise<Connection> => {
    const connection = Connection.create({
      source: UrlOrCardId.reconstruct(UrlOrCardIdType.URL, URL_A).unwrap(),
      target: UrlOrCardId.reconstruct(UrlOrCardIdType.URL, URL_B).unwrap(),
      sourceUrlMetadata: makeMetadata(URL_A, 'Fast source', UrlType.LINK),
      targetUrlMetadata: makeMetadata(URL_B, 'Fast target', UrlType.LINK),
      curatorId: CuratorId.create(CURATOR).unwrap(),
    }).unwrap();
    connection.clearEvents();
    (await connectionRepository.save(connection)).unwrap();
    return connection;
  };

  it('updates only the provided endpoint metadata', async () => {
    const connection = await createSavedConnection();
    const enriched = makeMetadata(URL_A, 'Enriched source', UrlType.RESEARCH);

    const result = await useCase.execute({
      connectionId: connection.connectionId.getStringValue(),
      sourceUrlMetadata: enriched,
    });

    expect(result.isOk()).toBe(true);
    const saved = (
      await connectionRepository.findById(connection.connectionId)
    ).unwrap() as Connection;
    expect(saved.sourceUrlMetadata?.title).toBe('Enriched source');
    expect(saved.sourceUrlMetadata?.type).toBe(UrlType.RESEARCH);
    // Target untouched
    expect(saved.targetUrlMetadata?.title).toBe('Fast target');
    expect(saved.targetUrlMetadata?.type).toBe(UrlType.LINK);
  });

  it('updates both endpoints when both are provided', async () => {
    const connection = await createSavedConnection();

    const result = await useCase.execute({
      connectionId: connection.connectionId.getStringValue(),
      sourceUrlMetadata: makeMetadata(URL_A, 'New source', UrlType.ARTICLE),
      targetUrlMetadata: makeMetadata(URL_B, 'New target', UrlType.BOOK),
    });

    expect(result.isOk()).toBe(true);
    const saved = (
      await connectionRepository.findById(connection.connectionId)
    ).unwrap() as Connection;
    expect(saved.sourceUrlMetadata?.type).toBe(UrlType.ARTICLE);
    expect(saved.targetUrlMetadata?.type).toBe(UrlType.BOOK);
  });

  it('rejects a request with no metadata updates', async () => {
    const connection = await createSavedConnection();

    const result = await useCase.execute({
      connectionId: connection.connectionId.getStringValue(),
    });

    expect(result.isErr()).toBe(true);
  });

  it('errors for an unknown connection', async () => {
    const result = await useCase.execute({
      connectionId: '00000000-0000-4000-8000-000000000000',
      sourceUrlMetadata: makeMetadata(URL_A, 'Enriched', UrlType.ARTICLE),
    });

    expect(result.isErr()).toBe(true);
  });
});
