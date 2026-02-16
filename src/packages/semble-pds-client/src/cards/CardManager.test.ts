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

    expect(mockAgent.com.atproto.repo.putRecord).toHaveBeenCalledWith({
      repo: 'did:plc:test123',
      collection: 'app.semble.card',
      rkey: '456',
      record: {
        $type: 'app.semble.card',
        type: 'NOTE',
        url: 'https://example.com',
        content: {
          $type: 'app.semble.card#noteContent',
          text: 'New text',
        },
        parentCard: {
          uri: 'at://did:plc:parent/app.semble.card/123',
          cid: 'bafycid123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    });
  });
});
