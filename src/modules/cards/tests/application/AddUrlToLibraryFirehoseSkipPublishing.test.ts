import { AddUrlToLibraryUseCase } from '../../application/useCases/commands/AddUrlToLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { FakeMetadataService } from '../utils/FakeMetadataService';
import { CardLibraryService } from '../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';

/**
 * Firehose-originated requests (publishedRecordId set) mirror records that
 * already exist on the user's PDS. They must NEVER publish — publishing
 * authenticates as the user from the worker process and races the web tier's
 * OAuth token refresh, which historically destroyed OAuth sessions.
 */
describe('AddUrlToLibraryUseCase - firehose skipPublishing', () => {
  let useCase: AddUrlToLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let metadataService: FakeMetadataService;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let eventPublisher: FakeEventPublisher;
  let curatorId: CuratorId;

  const firehoseRecordId = (suffix: string) =>
    PublishedRecordId.create({
      uri: `at://did:plc:testcurator/network.cosmik.card/${suffix}`,
      cid: `fake-cid-${suffix}`,
    });

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    metadataService = new FakeMetadataService();
    eventPublisher = new FakeEventPublisher();

    cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
      cardRepository,
    );
    cardLibraryService = new CardLibraryService(
      cardRepository,
      cardPublisher,
      collectionRepository,
      cardCollectionService,
    );

    useCase = new AddUrlToLibraryUseCase(
      cardRepository,
      metadataService,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    jest.restoreAllMocks();
  });

  it('does not publish when creating a card from a firehose event', async () => {
    const publishSpy = jest.spyOn(cardPublisher, 'publishCardToLibrary');

    const result = await useCase.execute({
      url: 'https://example.com/article',
      curatorId: curatorId.value,
      publishedRecordId: firehoseRecordId('abc'),
    });

    expect(result.isOk()).toBe(true);
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('does not republish when the firehose echoes a card already in the library (the web-save race)', async () => {
    // User saves via the web app - publishes normally
    const webResult = await useCase.execute({
      url: 'https://example.com/article',
      curatorId: curatorId.value,
    });
    expect(webResult.isOk()).toBe(true);

    const publishSpy = jest.spyOn(cardPublisher, 'publishCardToLibrary');

    // The firehose worker then processes the jetstream echo of that write
    const firehoseResult = await useCase.execute({
      url: 'https://example.com/article',
      curatorId: curatorId.value,
      publishedRecordId: firehoseRecordId('echo'),
    });

    expect(firehoseResult.isOk()).toBe(true);
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('does not publish collection links for firehose events with collections', async () => {
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .buildOrThrow();
    await collectionRepository.save(collection);

    const cardPublishSpy = jest.spyOn(cardPublisher, 'publishCardToLibrary');
    const linkPublishSpy = jest.spyOn(
      collectionPublisher,
      'publishCardAddedToCollection',
    );

    const result = await useCase.execute({
      url: 'https://example.com/article',
      curatorId: curatorId.value,
      collectionIds: [collection.collectionId.getStringValue()],
      publishedRecordId: firehoseRecordId('with-collections'),
    });

    expect(result.isOk()).toBe(true);
    expect(cardPublishSpy).not.toHaveBeenCalled();
    expect(linkPublishSpy).not.toHaveBeenCalled();
  });

  it('still publishes normally for non-firehose requests', async () => {
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .buildOrThrow();
    await collectionRepository.save(collection);

    const cardPublishSpy = jest.spyOn(cardPublisher, 'publishCardToLibrary');
    const linkPublishSpy = jest.spyOn(
      collectionPublisher,
      'publishCardAddedToCollection',
    );

    const result = await useCase.execute({
      url: 'https://example.com/article',
      curatorId: curatorId.value,
      collectionIds: [collection.collectionId.getStringValue()],
    });

    expect(result.isOk()).toBe(true);
    expect(cardPublishSpy).toHaveBeenCalled();
    expect(linkPublishSpy).toHaveBeenCalled();
  });
});
