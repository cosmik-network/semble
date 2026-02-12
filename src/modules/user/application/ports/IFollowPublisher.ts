import { Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { Follow } from '../../domain/Follow';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';

export interface IFollowPublisher {
  /**
   * Publish a follow relationship to AT Protocol.
   *
   * @param follow - The Follow domain object to publish
   * @returns Published record ID (AT URI + CID)
   */
  publishFollow(
    follow: Follow,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;

  /**
   * Unpublish (delete) a follow relationship from AT Protocol.
   *
   * @param follow - The Follow domain object with publishedRecordId to unpublish
   * @returns Success or error
   */
  unpublishFollow(follow: Follow): Promise<Result<void, UseCaseError>>;
}
