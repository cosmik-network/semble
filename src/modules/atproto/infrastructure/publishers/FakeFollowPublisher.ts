import { IFollowPublisher } from '../../../user/application/ports/IFollowPublisher';
import { Follow } from '../../../user/domain/Follow';
import { Result, ok } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';

export class FakeFollowPublisher implements IFollowPublisher {
  private publishedFollows: Map<string, PublishedRecordId> = new Map();

  async publishFollow(
    follow: Follow,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    const key = `${follow.followerId.value}:${follow.targetId}`;
    const fakeUri = `at://${follow.followerId.value}/network.cosmik.follow/${Date.now()}`;
    const fakeCid = `fake-cid-${Date.now()}`;

    const recordId = PublishedRecordId.create({
      uri: fakeUri,
      cid: fakeCid,
    });

    this.publishedFollows.set(key, recordId);

    return ok(recordId);
  }

  async unpublishFollow(follow: Follow): Promise<Result<void, UseCaseError>> {
    if (!follow.publishedRecordId) {
      return ok(undefined);
    }

    // Find and remove from map
    for (const [key, value] of this.publishedFollows.entries()) {
      if (value.uri === follow.publishedRecordId.uri) {
        this.publishedFollows.delete(key);
        break;
      }
    }

    return ok(undefined);
  }

  // Test helper
  getPublishedFollows(): Map<string, PublishedRecordId> {
    return this.publishedFollows;
  }
}
