import { GetConnectionsUseCase } from '../../application/useCases/queries/GetConnectionsUseCase';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { InMemoryConnectionQueryRepository } from '../utils/InMemoryConnectionQueryRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeIdentityResolutionService } from '../utils/FakeIdentityResolutionService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { Connection } from '../../domain/Connection';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { ConnectionType } from '../../domain/value-objects/ConnectionType';
import { ConnectionNote } from '../../domain/value-objects/ConnectionNote';
import {
  ConnectionSortField,
  SortOrder,
} from '../../domain/IConnectionQueryRepository';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { URL } from '../../domain/value-objects/URL';

describe('GetConnectionsUseCase', () => {
  let useCase: GetConnectionsUseCase;
  let connectionRepository: InMemoryConnectionRepository;
  let connectionQueryRepository: InMemoryConnectionQueryRepository;
  let cardRepository: InMemoryCardRepository;
  let cardQueryRepository: InMemoryCardQueryRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let identityResolver: FakeIdentityResolutionService;
  let curator1: CuratorId;
  let curator2: CuratorId;
  let curator3: CuratorId;

  beforeEach(() => {
    connectionRepository = InMemoryConnectionRepository.getInstance();
    connectionQueryRepository = new InMemoryConnectionQueryRepository(
      connectionRepository,
    );
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardQueryRepository = new InMemoryCardQueryRepository(
      cardRepository,
      collectionRepository,
    );
    identityResolver = new FakeIdentityResolutionService();

    useCase = new GetConnectionsUseCase(
      connectionQueryRepository,
      cardQueryRepository,
      identityResolver,
    );

    curator1 = CuratorId.create('did:plc:curator1').unwrap();
    curator2 = CuratorId.create('did:plc:curator2').unwrap();
    curator3 = CuratorId.create('did:plc:curator3').unwrap();

    // Set up identity mappings
    identityResolver.addHandleMapping('curator1.bsky.social', curator1.value);
    identityResolver.addHandleMapping('curator2.bsky.social', curator2.value);
    identityResolver.addHandleMapping('curator3.bsky.social', curator3.value);
  });

  afterEach(() => {
    connectionRepository.clear();
    cardRepository.clear();
    collectionRepository.clear();
    identityResolver.clear();
  });

  describe('Basic functionality', () => {
    it('should return connections with enriched URL metadata for both source and target', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';
      const url3 = 'https://example.com/article3';

      // Create URL cards for metadata
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url1).unwrap())
        .build();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url2).unwrap())
        .build();

      const card3 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url3).unwrap())
        .build();

      if (
        card1 instanceof Error ||
        card2 instanceof Error ||
        card3 instanceof Error
      ) {
        throw new Error('Failed to create cards');
      }

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);
      card3.addToLibrary(curator2);

      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      // Create connections from curator1
      const source1 = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target1 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection1 = Connection.create({
        source: source1,
        target: target1,
        type: ConnectionType.create(ConnectionTypeEnum.SUPPORTS).unwrap(),
        curatorId: curator1,
      }).unwrap();

      const source2 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const target2 = UrlOrCardId.createFromUrl(
        URL.create(url3).unwrap(),
      ).unwrap();
      const connection2 = Connection.create({
        source: source2,
        target: target2,
        type: ConnectionType.create(ConnectionTypeEnum.RELATED).unwrap(),
        note: ConnectionNote.create('Test note').unwrap(),
        curatorId: curator1,
      }).unwrap();

      await connectionRepository.save(connection1);
      await connectionRepository.save(connection2);

      // Execute the use case
      const query = {
        userId: curator1.value,
      };

      const result = await useCase.execute(query);

      // Verify the result
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(2);
      expect(response.pagination.totalCount).toBe(2);

      // Check first connection
      const firstConn = response.connections[0]!;
      expect(firstConn.connection.type).toBe(ConnectionTypeEnum.RELATED);
      expect(firstConn.connection.note).toBe('Test note');
      expect(firstConn.source.url).toBe(url2);
      expect(firstConn.target.url).toBe(url3);
      expect(firstConn.source.urlLibraryCount).toBe(1);
      expect(firstConn.target.urlLibraryCount).toBe(1);

      // Check second connection
      const secondConn = response.connections[1]!;
      expect(secondConn.connection.type).toBe(ConnectionTypeEnum.SUPPORTS);
      expect(secondConn.source.url).toBe(url1);
      expect(secondConn.target.url).toBe(url2);
    });

    it('should return empty result when user has no connections', async () => {
      const query = {
        userId: curator1.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(0);
      expect(response.pagination.totalCount).toBe(0);
    });

    it('should only return connections created by the specified user', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';

      // Create URL cards
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url1).unwrap())
        .build();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url2).unwrap())
        .build();

      if (card1 instanceof Error || card2 instanceof Error) {
        throw new Error('Failed to create cards');
      }

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator2);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create connections from different users
      const source1 = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target1 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();

      const connection1 = Connection.create({
        source: source1,
        target: target1,
        curatorId: curator1,
      }).unwrap();

      const connection2 = Connection.create({
        source: source1,
        target: target1,
        curatorId: curator2,
      }).unwrap();

      await connectionRepository.save(connection1);
      await connectionRepository.save(connection2);

      // Query for curator1's connections
      const query = {
        userId: curator1.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(1);
      expect(response.connections[0]!.connection.id).toBe(
        connection1.connectionId.getStringValue(),
      );
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      const urls = [];
      const cards = [];

      // Create 5 URL cards
      for (let i = 1; i <= 5; i++) {
        const url = `https://example.com/article${i}`;
        urls.push(url);

        const card = new CardBuilder()
          .withCuratorId(curator1.value)
          .withType(CardTypeEnum.URL)
          .withUrl(URL.create(url).unwrap())
          .build();

        if (card instanceof Error) {
          throw new Error(`Failed to create card ${i}`);
        }

        card.addToLibrary(curator1);
        cards.push(card);
        await cardRepository.save(card);
      }

      // Create 5 connections from curator1
      for (let i = 0; i < 4; i++) {
        const source = UrlOrCardId.createFromUrl(
          URL.create(urls[i]!).unwrap(),
        ).unwrap();
        const target = UrlOrCardId.createFromUrl(
          URL.create(urls[i + 1]!).unwrap(),
        ).unwrap();

        const connection = Connection.create({
          source,
          target,
          curatorId: curator1,
        }).unwrap();

        await connectionRepository.save(connection);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Test first page with limit 2
      const query1 = {
        userId: curator1.value,
        page: 1,
        limit: 2,
      };

      const result1 = await useCase.execute(query1);
      expect(result1.isOk()).toBe(true);
      const response1 = result1.unwrap();

      expect(response1.connections).toHaveLength(2);
      expect(response1.pagination.currentPage).toBe(1);
      expect(response1.pagination.totalCount).toBe(4);
      expect(response1.pagination.totalPages).toBe(2);
      expect(response1.pagination.hasMore).toBe(true);

      // Test second page
      const query2 = {
        userId: curator1.value,
        page: 2,
        limit: 2,
      };

      const result2 = await useCase.execute(query2);
      expect(result2.isOk()).toBe(true);
      const response2 = result2.unwrap();

      expect(response2.connections).toHaveLength(2);
      expect(response2.pagination.currentPage).toBe(2);
      expect(response2.pagination.hasMore).toBe(false);
    });

    it('should respect limit cap of 100', async () => {
      const query = {
        userId: curator1.value,
        limit: 200, // Should be capped at 100
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.pagination.limit).toBe(100);
    });
  });

  describe('Sorting', () => {
    it('should use default sorting parameters (createdAt DESC)', async () => {
      const query = {
        userId: curator1.value,
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.sorting.sortBy).toBe(ConnectionSortField.CREATED_AT);
      expect(response.sorting.sortOrder).toBe(SortOrder.DESC);
    });

    it('should sort by createdAt ASC when specified', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';
      const url3 = 'https://example.com/article3';

      // Create URL cards
      for (const url of [url1, url2, url3]) {
        const card = new CardBuilder()
          .withCuratorId(curator1.value)
          .withType(CardTypeEnum.URL)
          .withUrl(URL.create(url).unwrap())
          .build();

        if (card instanceof Error) {
          throw new Error('Failed to create card');
        }

        card.addToLibrary(curator1);
        await cardRepository.save(card);
      }

      // Create connections with delays to ensure different timestamps
      const source1 = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target1 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection1 = Connection.create({
        source: source1,
        target: target1,
        curatorId: curator1,
      }).unwrap();
      await connectionRepository.save(connection1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const source2 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const target2 = UrlOrCardId.createFromUrl(
        URL.create(url3).unwrap(),
      ).unwrap();
      const connection2 = Connection.create({
        source: source2,
        target: target2,
        curatorId: curator1,
      }).unwrap();
      await connectionRepository.save(connection2);

      const query = {
        userId: curator1.value,
        sortBy: ConnectionSortField.CREATED_AT,
        sortOrder: SortOrder.ASC,
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.sorting.sortBy).toBe(ConnectionSortField.CREATED_AT);
      expect(response.sorting.sortOrder).toBe(SortOrder.ASC);

      // Verify order - oldest first
      expect(response.connections[0]!.connection.id).toBe(
        connection1.connectionId.getStringValue(),
      );
      expect(response.connections[1]!.connection.id).toBe(
        connection2.connectionId.getStringValue(),
      );
    });
  });

  describe('Filtering by connection type', () => {
    it('should filter connections by connection type', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';
      const url3 = 'https://example.com/article3';

      // Create URL cards
      for (const url of [url1, url2, url3]) {
        const card = new CardBuilder()
          .withCuratorId(curator1.value)
          .withType(CardTypeEnum.URL)
          .withUrl(URL.create(url).unwrap())
          .build();

        if (card instanceof Error) {
          throw new Error('Failed to create card');
        }

        card.addToLibrary(curator1);
        await cardRepository.save(card);
      }

      // Create connections with different types
      const source1 = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target1 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection1 = Connection.create({
        source: source1,
        target: target1,
        type: ConnectionType.create(ConnectionTypeEnum.SUPPORTS).unwrap(),
        curatorId: curator1,
      }).unwrap();

      const source2 = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const target2 = UrlOrCardId.createFromUrl(
        URL.create(url3).unwrap(),
      ).unwrap();
      const connection2 = Connection.create({
        source: source2,
        target: target2,
        type: ConnectionType.create(ConnectionTypeEnum.OPPOSES).unwrap(),
        curatorId: curator1,
      }).unwrap();

      await connectionRepository.save(connection1);
      await connectionRepository.save(connection2);

      // Filter for SUPPORTS only
      const query = {
        userId: curator1.value,
        connectionTypes: [ConnectionTypeEnum.SUPPORTS],
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(1);
      expect(response.connections[0]!.connection.type).toBe(
        ConnectionTypeEnum.SUPPORTS,
      );
      expect(response.connections[0]!.connection.id).toBe(
        connection1.connectionId.getStringValue(),
      );
    });

    it('should support multiple connection type filters', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';
      const url3 = 'https://example.com/article3';
      const url4 = 'https://example.com/article4';

      // Create URL cards
      for (const url of [url1, url2, url3, url4]) {
        const card = new CardBuilder()
          .withCuratorId(curator1.value)
          .withType(CardTypeEnum.URL)
          .withUrl(URL.create(url).unwrap())
          .build();

        if (card instanceof Error) {
          throw new Error('Failed to create card');
        }

        card.addToLibrary(curator1);
        await cardRepository.save(card);
      }

      // Create connections with different types
      const connections = [
        {
          source: UrlOrCardId.createFromUrl(URL.create(url1).unwrap()).unwrap(),
          target: UrlOrCardId.createFromUrl(URL.create(url2).unwrap()).unwrap(),
          type: ConnectionTypeEnum.SUPPORTS,
        },
        {
          source: UrlOrCardId.createFromUrl(URL.create(url2).unwrap()).unwrap(),
          target: UrlOrCardId.createFromUrl(URL.create(url3).unwrap()).unwrap(),
          type: ConnectionTypeEnum.OPPOSES,
        },
        {
          source: UrlOrCardId.createFromUrl(URL.create(url3).unwrap()).unwrap(),
          target: UrlOrCardId.createFromUrl(URL.create(url4).unwrap()).unwrap(),
          type: ConnectionTypeEnum.RELATED,
        },
      ];

      for (const connData of connections) {
        const connection = Connection.create({
          source: connData.source,
          target: connData.target,
          type: ConnectionType.create(connData.type).unwrap(),
          curatorId: curator1,
        }).unwrap();

        await connectionRepository.save(connection);
      }

      // Filter for SUPPORTS and RELATED
      const query = {
        userId: curator1.value,
        connectionTypes: [
          ConnectionTypeEnum.SUPPORTS,
          ConnectionTypeEnum.RELATED,
        ],
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(2);
      const types = response.connections.map((c) => c.connection.type);
      expect(types).toContain(ConnectionTypeEnum.SUPPORTS);
      expect(types).toContain(ConnectionTypeEnum.RELATED);
      expect(types).not.toContain(ConnectionTypeEnum.OPPOSES);
    });
  });

  describe('User identifier resolution', () => {
    it('should resolve handle to DID', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';

      // Create URL cards
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url1).unwrap())
        .build();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url2).unwrap())
        .build();

      if (card1 instanceof Error || card2 instanceof Error) {
        throw new Error('Failed to create cards');
      }

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create connection
      const source = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection = Connection.create({
        source,
        target,
        curatorId: curator1,
      }).unwrap();

      await connectionRepository.save(connection);

      // Query using handle
      const query = {
        userId: 'curator1.bsky.social',
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(1);
    });

    it('should accept DID directly', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';

      // Create URL cards
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url1).unwrap())
        .build();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url2).unwrap())
        .build();

      if (card1 instanceof Error || card2 instanceof Error) {
        throw new Error('Failed to create cards');
      }

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create connection
      const source = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection = Connection.create({
        source,
        target,
        curatorId: curator1,
      }).unwrap();

      await connectionRepository.save(connection);

      // Query using DID
      const query = {
        userId: curator1.value,
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(1);
    });
  });

  describe('Validation', () => {
    it('should fail with invalid user identifier', async () => {
      const query = {
        userId: 'not-a-valid-identifier',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid user identifier');
      }
    });

    it('should fail when user identifier cannot be resolved', async () => {
      const query = {
        userId: 'nonexistent.bsky.social',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Could not resolve');
      }
    });
  });

  describe('URL library info', () => {
    it('should include urlInLibrary when callingUserId is provided', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';

      // curator1 creates connection and has both URLs
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url1).unwrap())
        .build();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url2).unwrap())
        .build();

      if (card1 instanceof Error || card2 instanceof Error) {
        throw new Error('Failed to create cards');
      }

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create connection
      const source = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection = Connection.create({
        source,
        target,
        curatorId: curator1,
      }).unwrap();

      await connectionRepository.save(connection);

      // Query with callingUserId
      const query = {
        userId: curator1.value,
        callingUserId: curator1.value,
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(1);
      expect(response.connections[0]!.source.urlInLibrary).toBe(true);
      expect(response.connections[0]!.target.urlInLibrary).toBe(true);
    });

    it('should not include urlInLibrary when callingUserId is not provided', async () => {
      const url1 = 'https://example.com/article1';
      const url2 = 'https://example.com/article2';

      // Create URL cards
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url1).unwrap())
        .build();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url2).unwrap())
        .build();

      if (card1 instanceof Error || card2 instanceof Error) {
        throw new Error('Failed to create cards');
      }

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create connection
      const source = UrlOrCardId.createFromUrl(
        URL.create(url1).unwrap(),
      ).unwrap();
      const target = UrlOrCardId.createFromUrl(
        URL.create(url2).unwrap(),
      ).unwrap();
      const connection = Connection.create({
        source,
        target,
        curatorId: curator1,
      }).unwrap();

      await connectionRepository.save(connection);

      // Query without callingUserId
      const query = {
        userId: curator1.value,
      };

      const result = await useCase.execute(query);
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.connections).toHaveLength(1);
      expect(response.connections[0]!.source.urlInLibrary).toBeUndefined();
      expect(response.connections[0]!.target.urlInLibrary).toBeUndefined();
    });
  });
});
