import { BundleRecipientResolver } from '../../application/services/BundleRecipientResolver';
import { CardActivityBundle } from '../../application/bundleHandlers/ICardActivityBundleHandler';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { ok } from '../../../../shared/core/Result';
import { CollectionAccessType } from '../../../cards/domain/Collection';

const ACTOR = 'did:plc:actor';
const VIA_CARD_CURATOR = 'did:plc:viacardcurator';
const BSKY_AUTHOR = 'did:plc:bskyauthor';
const COLLECTION_AUTHOR_OPEN = 'did:plc:openauthor';
const COLLECTION_AUTHOR_CLOSED = 'did:plc:closedauthor';

const APP_URL = 'https://semble.so';

function makeConfigService() {
  return {
    getAppConfig: () => ({ appUrl: APP_URL }),
    getAtProtoCollections: () => ({
      collection: 'network.cosmik.local.collection',
    }),
  } as any;
}

function makeBundle(
  overrides: Partial<CardActivityBundle> = {},
): CardActivityBundle {
  return {
    cardId: 'main-card',
    actorId: ACTOR,
    collectionIds: [],
    hasLibraryEvent: true,
    hasCollectionEvents: false,
    bundledAt: new Date(),
    ...overrides,
  };
}

describe('BundleRecipientResolver', () => {
  describe('via-card curator', () => {
    it('returns the via-card curator when the card has a viaCardId', async () => {
      const viaCardId = { value: 'via-card-id' };
      const cardRepository = {
        findById: jest.fn(async (id: any) => {
          const idStr =
            typeof id?.getStringValue === 'function'
              ? id.getStringValue()
              : id?.value;
          if (idStr === 'main-card') {
            return ok({ url: undefined, viaCardId } as any);
          }
          return ok({
            curatorId: { value: VIA_CARD_CURATOR },
          } as any);
        }),
      } as any;

      const resolver = new BundleRecipientResolver(
        cardRepository,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        makeConfigService(),
      );

      const recipients = await resolver.resolveSpecificRecipients(
        makeBundle({ cardId: 'main-card' }),
      );

      expect(recipients.has(VIA_CARD_CURATOR)).toBe(true);
    });
  });

  describe('OPEN-collection authors', () => {
    it('includes OPEN-collection authors and skips CLOSED ones', async () => {
      const cardRepository = {
        findById: jest.fn(async () =>
          ok({ url: undefined, viaCardId: undefined } as any),
        ),
      } as any;

      const collectionRepository = {
        findById: jest.fn(async (id: CollectionId) => {
          const idStr = id.getStringValue();
          if (idStr === 'open-collection') {
            return ok({
              accessType: CollectionAccessType.OPEN,
              authorId: { value: COLLECTION_AUTHOR_OPEN },
            } as any);
          }
          return ok({
            accessType: CollectionAccessType.CLOSED,
            authorId: { value: COLLECTION_AUTHOR_CLOSED },
          } as any);
        }),
      } as any;

      const resolver = new BundleRecipientResolver(
        cardRepository,
        collectionRepository,
        {} as any,
        {} as any,
        {} as any,
        makeConfigService(),
      );

      const recipients = await resolver.resolveSpecificRecipients(
        makeBundle({
          cardId: 'main-card',
          collectionIds: ['open-collection', 'closed-collection'],
        }),
      );

      expect(recipients.has(COLLECTION_AUTHOR_OPEN)).toBe(true);
      expect(recipients.has(COLLECTION_AUTHOR_CLOSED)).toBe(false);
    });
  });

  describe('URL-mention author', () => {
    it('resolves a Bluesky-post URL to the post author DID', async () => {
      const cardRepository = {
        findById: jest.fn(async () =>
          ok({
            url: {
              toString: () =>
                `https://bsky.app/profile/${BSKY_AUTHOR}/post/abc123`,
            },
            viaCardId: undefined,
          } as any),
        ),
      } as any;

      const userRepository = {
        findByDID: jest.fn(async () => ok({ did: BSKY_AUTHOR } as any)),
      } as any;

      const resolver = new BundleRecipientResolver(
        cardRepository,
        { findById: jest.fn() } as any,
        userRepository,
        { resolveToDID: jest.fn() } as any,
        {} as any,
        makeConfigService(),
      );

      const recipients = await resolver.resolveSpecificRecipients(
        makeBundle({ cardId: 'main-card' }),
      );

      expect(recipients.has(BSKY_AUTHOR)).toBe(true);
    });

    it('does not resolve a URL when the card has a viaCardId (viaCard takes precedence)', async () => {
      const cardRepository = {
        findById: jest.fn(async (id: any) => {
          const idStr =
            typeof id?.getStringValue === 'function'
              ? id.getStringValue()
              : id?.value;
          if (idStr === 'main-card') {
            return ok({
              url: {
                toString: () =>
                  `https://bsky.app/profile/${BSKY_AUTHOR}/post/abc123`,
              },
              viaCardId: { value: 'via-card-id' },
            } as any);
          }
          return ok({ curatorId: { value: VIA_CARD_CURATOR } } as any);
        }),
      } as any;

      const resolver = new BundleRecipientResolver(
        cardRepository,
        { findById: jest.fn() } as any,
        { findByDID: jest.fn() } as any,
        { resolveToDID: jest.fn() } as any,
        {} as any,
        makeConfigService(),
      );

      const recipients = await resolver.resolveSpecificRecipients(
        makeBundle({ cardId: 'main-card' }),
      );

      expect(recipients.has(VIA_CARD_CURATOR)).toBe(true);
      expect(recipients.has(BSKY_AUTHOR)).toBe(false);
    });
  });
});
