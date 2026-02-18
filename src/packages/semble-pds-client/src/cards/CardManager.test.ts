import { CardManager } from './CardManager';

describe('CardManager', () => {
  let cardManager: CardManager;
  let mockAgent: any;

  beforeEach(() => {
    mockAgent = {
      session: { did: 'did:plc:test123' },
      com: {
        atproto: {
          repo: {
            getRecord: jest.fn(),
            putRecord: jest.fn(),
            createRecord: jest.fn(),
          },
        },
      },
    };
    cardManager = new CardManager(mockAgent, 'app.semble', 'app.semble.card');
  });

  it('should preserve all fields when updating note', async () => {
    const existingRecord = {
      data: {
        value: {
          $type: 'app.semble.card',
          type: 'NOTE',
          url: 'https://example.com',
          content: {
            $type: 'app.semble.card#noteContent',
            text: 'Old text',
          },
          parentCard: {
            uri: 'at://did:plc:parent/app.semble.card/123',
            cid: 'bafycid123',
          },
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      },
    };

    mockAgent.com.atproto.repo.getRecord.mockResolvedValue(existingRecord);

    await cardManager.updateNote(
      { uri: 'at://did:plc:test123/app.semble.card/456', cid: 'bafycid456' },
      'New text',
    );

    const putRecordCall = mockAgent.com.atproto.repo.putRecord.mock.calls[0][0];

    // Check all fields are preserved
    expect(putRecordCall.repo).toBe('did:plc:test123');
    expect(putRecordCall.collection).toBe('app.semble.card');
    expect(putRecordCall.rkey).toBe('456');

    // Check record structure
    expect(putRecordCall.record.$type).toBe('app.semble.card');
    expect(putRecordCall.record.type).toBe('NOTE');
    expect(putRecordCall.record.url).toBe('https://example.com'); // ✅ Preserved
    expect(putRecordCall.record.content.text).toBe('New text'); // ✅ Updated
    expect(putRecordCall.record.content.$type).toBe(
      'app.semble.card#noteContent',
    );
    expect(putRecordCall.record.parentCard).toEqual({
      // ✅ Preserved
      uri: 'at://did:plc:parent/app.semble.card/123',
      cid: 'bafycid123',
    });
    expect(putRecordCall.record.createdAt).toBe('2024-01-01T00:00:00.000Z'); // ✅ Preserved
    expect(putRecordCall.record.updatedAt).toBeDefined(); // ✅ Added
    expect(typeof putRecordCall.record.updatedAt).toBe('string');
  });
});
