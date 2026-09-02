import { ok, err } from '../../../../shared/core/Result';
import { NotificationService } from '../../domain/services/NotificationService';
import { InMemoryNotificationRepository } from '../infrastructure/InMemoryNotificationRepository';
import { MentionRecipientResolver } from '../../application/services/MentionRecipientResolver';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { DID } from '../../../atproto/domain/DID';

const actor = CuratorId.create('did:plc:actor').unwrap();
const alice = CuratorId.create('did:plc:alice').unwrap();
const bob = CuratorId.create('did:plc:bob').unwrap();
const cardId = CardId.create(new UniqueEntityID()).unwrap();

describe('NotificationService.reconcileMentionNotifications', () => {
  let repo: InMemoryNotificationRepository;
  let service: NotificationService;

  beforeEach(() => {
    InMemoryNotificationRepository.resetInstance();
    repo = InMemoryNotificationRepository.getInstance();
    service = new NotificationService(repo);
  });

  async function mentionsFor(item: { cardId?: string }) {
    return (await repo.findMentionNotificationsByItem(item)).unwrap();
  }

  it('creates a mention notification per recipient', async () => {
    const result = await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [alice, bob],
    );

    expect(result.isOk()).toBe(true);
    const stored = await mentionsFor({ cardId: cardId.getStringValue() });
    expect(stored).toHaveLength(2);
    expect(stored.map((n) => n.recipientUserId.value).sort()).toEqual([
      'did:plc:alice',
      'did:plc:bob',
    ]);
    expect((stored[0]!.metadata as any).mentionSource).toBe('NOTE');
  });

  it('never notifies the actor about their own mention', async () => {
    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [actor, alice],
    );

    const stored = await mentionsFor({ cardId: cardId.getStringValue() });
    expect(stored.map((n) => n.recipientUserId.value)).toEqual([
      'did:plc:alice',
    ]);
  });

  it('does not duplicate notifications when reconciling twice', async () => {
    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [alice],
    );
    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [alice],
    );

    const stored = await mentionsFor({ cardId: cardId.getStringValue() });
    expect(stored).toHaveLength(1);
  });

  it('retracts unread notifications for removed mentions and adds new ones', async () => {
    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [alice],
    );

    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [bob],
    );

    const stored = await mentionsFor({ cardId: cardId.getStringValue() });
    expect(stored.map((n) => n.recipientUserId.value)).toEqual(['did:plc:bob']);
  });

  it('leaves read notifications alone when the mention is removed', async () => {
    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [alice],
    );
    const [notification] = await mentionsFor({
      cardId: cardId.getStringValue(),
    });
    notification!.markAsRead();
    await repo.save(notification!);

    await service.reconcileMentionNotifications(
      actor,
      { mentionSource: 'NOTE', cardId },
      [],
    );

    const stored = await mentionsFor({ cardId: cardId.getStringValue() });
    expect(stored).toHaveLength(1);
  });
});

describe('MentionRecipientResolver', () => {
  function makeResolver(resolvable: Record<string, string>, users: string[]) {
    const identityResolutionService = {
      resolveToDID: async (identifier: any) => {
        const did = resolvable[identifier.value];
        return did
          ? ok(DID.create(did).unwrap())
          : err(new Error('unresolvable'));
      },
    } as any;
    const userRepository = {
      findByDID: async (did: DID) =>
        ok(users.includes(did.value) ? ({ id: did.value } as any) : null),
    } as any;
    return new MentionRecipientResolver(
      identityResolutionService,
      userRepository,
    );
  }

  it('resolves mentioned handles to registered Semble users only', async () => {
    const resolver = makeResolver(
      {
        'alice.bsky.social': 'did:plc:alice',
        'ghost.bsky.social': 'did:plc:ghost',
      },
      ['did:plc:alice'],
    );

    const recipients = await resolver.resolveMentionedUsers(
      'cc @alice.bsky.social and @ghost.bsky.social and @unresolvable.example.com',
    );

    expect(recipients.map((r) => r.value)).toEqual(['did:plc:alice']);
  });

  it('returns no recipients for text without mentions', async () => {
    const resolver = makeResolver({}, []);
    expect(await resolver.resolveMentionedUsers('just a plain note')).toEqual(
      [],
    );
  });
});
