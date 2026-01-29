import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IFirehoseEventDuplicationService,
  FirehoseEventType,
} from '../../domain/services/IFirehoseEventDuplicationService';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { ATUri } from '../../domain/ATUri';
import { publishedRecords } from '../../../cards/infrastructure/repositories/schema/publishedRecord.sql';
import { Result, ok, err } from 'src/shared/core/Result';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

export class DrizzleFirehoseEventDuplicationService
  implements IFirehoseEventDuplicationService
{
  constructor(
    private db: PostgresJsDatabase,
    private atUriResolver: IAtUriResolutionService,
    private configService: EnvironmentConfigService,
  ) {}

  async hasEventBeenProcessed(
    atUri: string,
    cid: string | null,
    operation: FirehoseEventType,
  ): Promise<Result<boolean>> {
    try {
      // For CREATE/UPDATE: check if (uri, cid) exists
      if (operation === 'create' || operation === 'update') {
        if (!cid) return ok(false);

        const result = await this.db
          .select({ id: publishedRecords.id })
          .from(publishedRecords)
          .where(
            and(eq(publishedRecords.uri, atUri), eq(publishedRecords.cid, cid)),
          )
          .limit(1);

        return ok(result.length > 0);
      }

      // For DELETE: use more complex logic
      return this.hasBeenDeleted(atUri);
    } catch (error) {
      return err(error as Error);
    }
  }

  async hasBeenDeleted(atUri: string): Promise<Result<boolean>> {
    try {
      // 1. Find all publishedRecords with matching URI
      const records = await this.db
        .select()
        .from(publishedRecords)
        .where(eq(publishedRecords.uri, atUri));

      if (records.length === 0) {
        return ok(true); // No records = was deleted
      }

      // 2. Parse AT URI to get collection
      const atUriResult = ATUri.create(atUri);
      if (atUriResult.isErr()) {
        return err(atUriResult.error);
      }

      const collection = atUriResult.value.collection;
      const collections = this.configService.getAtProtoCollections();

      // 3. Check if entity still exists based on collection type
      switch (collection) {
        case collections.collection:
        case collections.marginCollection: {
          const collectionIdResult =
            await this.atUriResolver.resolveCollectionId(atUri);
          if (collectionIdResult.isErr()) {
            return err(collectionIdResult.error);
          }
          return ok(collectionIdResult.value === null);
        }
        case collections.card:
        case collections.marginBookmark: {
          const cardIdResult = await this.atUriResolver.resolveCardId(atUri);
          if (cardIdResult.isErr()) {
            return err(cardIdResult.error);
          }
          return ok(cardIdResult.value === null);
        }
        case collections.collectionLink:
        case collections.marginCollectionItem: {
          const linkInfoResult =
            await this.atUriResolver.resolveCollectionLinkId(atUri);
          if (linkInfoResult.isErr()) {
            return err(linkInfoResult.error);
          }
          return ok(linkInfoResult.value === null);
        }
        default:
          return err(new Error(`Unknown collection type: ${collection}`));
      }
    } catch (error) {
      return err(error as Error);
    }
  }
}
