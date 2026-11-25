import { GetMyNotificationsUseCase } from '../../application/useCases/queries/GetMyNotificationsUseCase';
import { Notification } from '../../domain/Notification';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { InMemoryNotificationRepository } from '../infrastructure/InMemoryNotificationRepository';
import { FakeProfileService } from '../../../cards/tests/utils/FakeProfileService';
import { UserProfile } from '../../../cards/domain/services/IProfileService';

const RECIPIENT = 'did:plc:recipient';
const ACTOR = 'did:plc:actor';
const AUTHOR = 'did:plc:author';
const URL = 'https://example.com/page';
const CARD_ID = '77777777-7777-4777-8777-777777777777';
const COLLECTION_ID = '88888888-8888-4888-8888-888888888888';
const PASSAGE = 'the exact quoted passage';

function makeProfile(id: string, handle: string): UserProfile {
  return {
    id,
    handle,
    name: `User ${handle}`,
  };
}

describe('GetMyNotificationsUseCase annotation cards', () => {
  it('renders USER_ADDED_TO_YOUR_COLLECTION for an annotation card as an annotation, not a URL card', async () => {
    const repository = InMemoryNotificationRepository.getInstance();
    repository.setDependencies({
      getAnnotationCardById: jest.fn(async () => ({
        id: CARD_ID,
        url: URL,
        authorId: AUTHOR,
        libraryCount: 3,
        connectionCount: 1,
        selectors: [{ type: 'TextQuoteSelector', exact: PASSAGE }],
        note: 'a note',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      })) as any,
      getBatchAnnotationCardViews: jest.fn(async () => new Map()),
    } as any);

    const notification = Notification.createUserAddedToYourCollection(
      CuratorId.create(RECIPIENT).unwrap(),
      CuratorId.create(ACTOR).unwrap(),
      CardId.createFromString(CARD_ID).unwrap(),
      CollectionId.createFromString(COLLECTION_ID).unwrap(),
    ).unwrap();
    await repository.save(notification);

    const profileService = new FakeProfileService();
    profileService.addProfile(makeProfile(RECIPIENT, 'recipient'));
    profileService.addProfile(makeProfile(ACTOR, 'actor'));
    profileService.addProfile(makeProfile(AUTHOR, 'author'));

    const useCase = new GetMyNotificationsUseCase(
      repository,
      profileService as any,
      { findByIds: jest.fn(async () => []) } as any,
      {
        getBatchAnnotationCardViews: jest.fn(async () => new Map()),
      } as any,
    );

    const result = await useCase.execute({ userId: RECIPIENT });
    expect(result.isOk()).toBe(true);

    const items = result.unwrap().notifications;
    expect(items).toHaveLength(1);
    const card = (items[0] as any).card;
    expect(card.type).toBe('ANNOTATION');
    expect(card.url).toBe(URL);
    expect(card.selectors).toEqual([
      { type: 'TextQuoteSelector', exact: PASSAGE },
    ]);
    expect(card.note).toBe('a note');
    expect(card.author.handle).toBe('author');
    expect(card.libraryCount).toBe(3);
  });
});
