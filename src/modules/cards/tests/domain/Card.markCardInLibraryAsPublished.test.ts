import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { URL } from '../../domain/value-objects/URL';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { Card } from '../../domain/Card';

describe('Card.markCardInLibraryAsPublished', () => {
  const url = URL.create('https://example.com/paper').unwrap();
  const curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  const otherUserId = CuratorId.create('did:plc:otheruser').unwrap();

  const buildUrlCard = (): Card => {
    const card = new CardBuilder()
      .withCuratorId(curatorId.value)
      .withUrlCard(url)
      .build();
    if (card instanceof Error) {
      throw card;
    }
    return card;
  };

  it('moves the card-level published record to the new CID when the record it tracks is republished', () => {
    const card = buildUrlCard();
    card.addToLibrary(curatorId);

    const original = PublishedRecordId.create({
      uri: `at://${curatorId.value}/network.cosmik.card/rkey123`,
      cid: 'original-cid',
    });
    card.markCardInLibraryAsPublished(curatorId, original);
    expect(card.publishedRecordId?.getValue().cid).toBe('original-cid');

    const republished = PublishedRecordId.create({
      uri: `at://${curatorId.value}/network.cosmik.card/rkey123`,
      cid: 'new-cid',
    });
    card.markCardInLibraryAsPublished(curatorId, republished);

    expect(card.publishedRecordId?.getValue().cid).toBe('new-cid');
    expect(
      card.getLibraryInfo(curatorId)?.publishedRecordId?.getValue().cid,
    ).toBe('new-cid');
  });

  it("leaves the card-level published record alone when a different user's membership record is republished", () => {
    // NOTE card: URL cards only allow a single library membership
    const noteCard = new CardBuilder()
      .withCuratorId(curatorId.value)
      .withType(CardTypeEnum.NOTE)
      .build();
    if (noteCard instanceof Error) {
      throw noteCard;
    }
    const card = noteCard;
    card.addToLibrary(curatorId);
    card.addToLibrary(otherUserId);

    const creatorRecord = PublishedRecordId.create({
      uri: `at://${curatorId.value}/network.cosmik.card/rkey123`,
      cid: 'creator-cid',
    });
    card.markCardInLibraryAsPublished(curatorId, creatorRecord);

    const otherRecord = PublishedRecordId.create({
      uri: `at://${otherUserId.value}/network.cosmik.card/rkey456`,
      cid: 'other-cid-v1',
    });
    card.markCardInLibraryAsPublished(otherUserId, otherRecord);

    const otherRepublished = PublishedRecordId.create({
      uri: `at://${otherUserId.value}/network.cosmik.card/rkey456`,
      cid: 'other-cid-v2',
    });
    card.markCardInLibraryAsPublished(otherUserId, otherRepublished);

    expect(card.publishedRecordId?.getValue().cid).toBe('creator-cid');
    expect(
      card.getLibraryInfo(otherUserId)?.publishedRecordId?.getValue().cid,
    ).toBe('other-cid-v2');
  });
});
