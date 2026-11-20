import { ConnectionMapper } from '../../infrastructure/mappers/ConnectionMapper';
import { Connection } from '../../../cards/domain/Connection';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { UrlOrCardId } from '../../../cards/domain/value-objects/UrlOrCardId';
import { URL } from '../../../cards/domain/value-objects/URL';
import { CardId } from '../../../cards/domain/value-objects/CardId';

describe('ConnectionMapper.toCreateRecordDTO', () => {
  const curatorId = CuratorId.create('did:plc:testcurator123456789').unwrap();

  const buildConnection = (
    source: UrlOrCardId,
    target: UrlOrCardId,
  ): Connection =>
    Connection.create({
      source,
      target,
      curatorId,
    }).unwrap();

  it('serializes URL endpoints as their url strings', () => {
    const connection = buildConnection(
      UrlOrCardId.createFromUrl(
        URL.create('https://example.com/a').unwrap(),
      ).unwrap(),
      UrlOrCardId.createFromUrl(
        URL.create('https://example.com/b').unwrap(),
      ).unwrap(),
    );

    const record = ConnectionMapper.toCreateRecordDTO(connection);

    expect(record.source).toBe('https://example.com/a');
    expect(record.target).toBe('https://example.com/b');
  });

  it('uses the provided card record URIs over the local card ids', () => {
    const cardId = CardId.createFromString(
      'b3e1b8a4-5c32-4d87-9f6a-1a2b3c4d5e6f',
    ).unwrap();
    const connection = buildConnection(
      UrlOrCardId.createFromCard(cardId).unwrap(),
      UrlOrCardId.createFromUrl(
        URL.create('https://example.com/b').unwrap(),
      ).unwrap(),
    );

    const record = ConnectionMapper.toCreateRecordDTO(connection, {
      source: `at://did:plc:someone/at.margin.note/abc123`,
    });

    expect(record.source).toBe('at://did:plc:someone/at.margin.note/abc123');
    expect(record.target).toBe('https://example.com/b');
  });

  it('falls back to the local card id when no URI is resolved', () => {
    const cardId = CardId.createFromString(
      'b3e1b8a4-5c32-4d87-9f6a-1a2b3c4d5e6f',
    ).unwrap();
    const connection = buildConnection(
      UrlOrCardId.createFromCard(cardId).unwrap(),
      UrlOrCardId.createFromUrl(
        URL.create('https://example.com/b').unwrap(),
      ).unwrap(),
    );

    const record = ConnectionMapper.toCreateRecordDTO(connection, {
      target: 'https://example.com/b',
    });

    expect(record.source).toBe(cardId.getStringValue());
  });
});
