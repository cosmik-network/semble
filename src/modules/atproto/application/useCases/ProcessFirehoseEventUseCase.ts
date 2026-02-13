import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { AppError } from 'src/shared/core/AppError';
import { IFirehoseEventDuplicationService } from '../../domain/services/IFirehoseEventDuplicationService';
import { ATUri } from '../../domain/ATUri';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { ProcessCardFirehoseEventUseCase } from './ProcessCardFirehoseEventUseCase';
import { ProcessCollectionFirehoseEventUseCase } from './ProcessCollectionFirehoseEventUseCase';
import { ProcessCollectionLinkFirehoseEventUseCase } from './ProcessCollectionLinkFirehoseEventUseCase';
import { ProcessMarginBookmarkFirehoseEventUseCase } from './ProcessMarginBookmarkFirehoseEventUseCase';
import { ProcessMarginCollectionFirehoseEventUseCase } from './ProcessMarginCollectionFirehoseEventUseCase';
import { ProcessMarginCollectionItemFirehoseEventUseCase } from './ProcessMarginCollectionItemFirehoseEventUseCase';
import { ProcessCollectionLinkRemovalFirehoseEventUseCase } from './ProcessCollectionLinkRemovalFirehoseEventUseCase';
import { ProcessFollowFirehoseEventUseCase } from './ProcessFollowFirehoseEventUseCase';
import type { RepoRecord } from '@atproto/lexicon';
import { Record as CardRecord } from '../../infrastructure/lexicon/types/network/cosmik/card';
import { Record as CollectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/collection';
import { Record as CollectionLinkRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLink';
import { Record as MarginBookmarkRecord } from '../../infrastructure/lexicon/types/at/margin/bookmark';
import { Record as MarginCollectionRecord } from '../../infrastructure/lexicon/types/at/margin/collection';
import { Record as MarginCollectionItemRecord } from '../../infrastructure/lexicon/types/at/margin/collectionItem';
import { Record as CollectionLinkRemovalRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLinkRemoval';
import { Record as FollowRecord } from '../../infrastructure/lexicon/types/network/cosmik/follow';

export interface ProcessFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: RepoRecord; // The AT Protocol record data
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class ProcessFirehoseEventUseCase
  implements UseCase<ProcessFirehoseEventDTO, Result<void>>
{
  constructor(
    private duplicationService: IFirehoseEventDuplicationService,
    private configService: EnvironmentConfigService,
    private processCardFirehoseEventUseCase: ProcessCardFirehoseEventUseCase,
    private processCollectionFirehoseEventUseCase: ProcessCollectionFirehoseEventUseCase,
    private processCollectionLinkFirehoseEventUseCase: ProcessCollectionLinkFirehoseEventUseCase,
    private processMarginBookmarkFirehoseEventUseCase: ProcessMarginBookmarkFirehoseEventUseCase,
    private processMarginCollectionFirehoseEventUseCase: ProcessMarginCollectionFirehoseEventUseCase,
    private processMarginCollectionItemFirehoseEventUseCase: ProcessMarginCollectionItemFirehoseEventUseCase,
    private processCollectionLinkRemovalFirehoseEventUseCase: ProcessCollectionLinkRemovalFirehoseEventUseCase,
    private processFollowFirehoseEventUseCase: ProcessFollowFirehoseEventUseCase,
  ) {}

  async execute(request: ProcessFirehoseEventDTO): Promise<Result<void>> {
    try {
      // 1. Check for duplicates
      const isDuplicateResult =
        await this.duplicationService.hasEventBeenProcessed(
          request.atUri,
          request.cid,
          request.eventType,
        );

      if (isDuplicateResult.isErr()) {
        return err(AppError.UnexpectedError.create(isDuplicateResult.error));
      }

      if (isDuplicateResult.value) {
        return ok(undefined);
      }

      // 2. Parse AT URI to get collection
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        return err(
          new ValidationError(`Invalid AT URI: ${atUriResult.error.message}`),
        );
      }

      const collection = atUriResult.value.collection;
      const collections = this.configService.getAtProtoCollections();

      // 3. Route to appropriate handler based on collection type
      switch (collection) {
        case collections.card:
          // Validate CardRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const cardRecord = request.record as CardRecord;
            if (!cardRecord.type || !cardRecord.content) {
              return err(new ValidationError('Invalid card record structure'));
            }
          }
          return this.processCardFirehoseEventUseCase.execute({
            ...request,
            record: request.record as CardRecord | undefined,
          });
        case collections.collection:
          // Validate CollectionRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const collectionRecord = request.record as CollectionRecord;
            if (!collectionRecord.name) {
              return err(
                new ValidationError('Invalid collection record structure'),
              );
            }
          }
          return this.processCollectionFirehoseEventUseCase.execute({
            ...request,
            record: request.record as CollectionRecord | undefined,
          });
        case collections.collectionLink:
          // Validate CollectionLinkRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const linkRecord = request.record as CollectionLinkRecord;
            if (
              !linkRecord.collection ||
              !linkRecord.card ||
              !linkRecord.addedBy
            ) {
              return err(
                new ValidationError('Invalid collection link record structure'),
              );
            }
          }
          return this.processCollectionLinkFirehoseEventUseCase.execute({
            ...request,
            record: request.record as CollectionLinkRecord | undefined,
          });
        case collections.collectionLinkRemoval:
          // Validate CollectionLinkRemovalRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const removalRecord = request.record as CollectionLinkRemovalRecord;
            if (
              !removalRecord.collection ||
              !removalRecord.removedLink ||
              !removalRecord.removedAt
            ) {
              return err(
                new ValidationError(
                  'Invalid collection link removal record structure',
                ),
              );
            }
          }
          return this.processCollectionLinkRemovalFirehoseEventUseCase.execute({
            ...request,
            record: request.record as CollectionLinkRemovalRecord | undefined,
          });
        case collections.marginBookmark:
          // Validate MarginBookmarkRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const bookmarkRecord = request.record as MarginBookmarkRecord;
            if (!bookmarkRecord.source) {
              return err(
                new ValidationError('Invalid Margin bookmark record structure'),
              );
            }
          }
          return this.processMarginBookmarkFirehoseEventUseCase.execute({
            ...request,
            record: request.record as MarginBookmarkRecord | undefined,
          });
        case collections.marginCollection:
          // Validate MarginCollectionRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const marginCollectionRecord =
              request.record as MarginCollectionRecord;
            if (!marginCollectionRecord.name) {
              return err(
                new ValidationError(
                  'Invalid Margin collection record structure',
                ),
              );
            }
          }
          return this.processMarginCollectionFirehoseEventUseCase.execute({
            ...request,
            record: request.record as MarginCollectionRecord | undefined,
          });
        case collections.marginCollectionItem:
          // Validate MarginCollectionItemRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const itemRecord = request.record as MarginCollectionItemRecord;
            if (!itemRecord.collection || !itemRecord.annotation) {
              return err(
                new ValidationError(
                  'Invalid Margin collection item record structure',
                ),
              );
            }
          }
          return this.processMarginCollectionItemFirehoseEventUseCase.execute({
            ...request,
            record: request.record as MarginCollectionItemRecord | undefined,
          });
        case collections.follow:
          // Validate FollowRecord structure
          if (
            request.record &&
            (request.eventType === 'create' || request.eventType === 'update')
          ) {
            const followRecord = request.record as FollowRecord;
            if (!followRecord.subject || !followRecord.createdAt) {
              return err(
                new ValidationError('Invalid follow record structure'),
              );
            }
          }
          return this.processFollowFirehoseEventUseCase.execute({
            ...request,
            record: request.record as FollowRecord | undefined,
          });
        default:
          return err(
            new ValidationError(`Unknown collection type: ${collection}`),
          );
      }
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
