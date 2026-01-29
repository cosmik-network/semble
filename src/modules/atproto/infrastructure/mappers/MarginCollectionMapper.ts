import { Collection } from 'src/modules/cards/domain/Collection';
import { Record } from '../lexicon/types/at/margin/collection';
import { ATPROTO_NSID } from 'src/shared/constants/atproto';

type MarginCollectionRecordDTO = Record;

/**
 * Maps Collection domain objects to Margin collection records.
 * Margin collections have a simpler schema than Cosmik collections.
 */
export class MarginCollectionMapper {
  static toCreateRecordDTO(collection: Collection): MarginCollectionRecordDTO {
    return {
      $type: ATPROTO_NSID.MARGIN.COLLECTION as any,
      name: collection.name.value,
      description: collection.description?.value,
      // Note: Margin collections don't support accessType or collaborators
      // The icon field is also not currently mapped from our domain model
      createdAt: collection.createdAt.toISOString(),
    };
  }
}
