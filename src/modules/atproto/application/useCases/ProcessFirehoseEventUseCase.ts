import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { AppError } from 'src/shared/core/AppError';
import { IFirehoseEventDuplicationService } from '../../domain/services/IFirehoseEventDuplicationService';
import { ATUri } from '../../domain/ATUri';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import {
  ProcessCardFirehoseEventDTO,
  ProcessCardFirehoseEventUseCase,
} from './ProcessCardFirehoseEventUseCase';
import {
  ProcessCollectionFirehoseEventDTO,
  ProcessCollectionFirehoseEventUseCase,
} from './ProcessCollectionFirehoseEventUseCase';
import {
  ProcessCollectionLinkFirehoseEventDTO,
  ProcessCollectionLinkFirehoseEventUseCase,
} from './ProcessCollectionLinkFirehoseEventUseCase';
import { Record as CardRecord } from '../../infrastructure/lexicon/types/network/cosmik/card';
import { Record as CollectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/collection';
import { Record as CollectionLinkRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLink';

export interface ProcessFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CardRecord | CollectionRecord | CollectionLinkRecord; // The AT Protocol record data
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
  ) {}

  async execute(request: ProcessFirehoseEventDTO): Promise<Result<void>> {
    try {
      console.log(`Processing firehose event: ${JSON.stringify(request)}`);

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
        console.log(
          `Skipping duplicate firehose event: ${request.atUri} (${request.eventType})`,
        );
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
          return this.processCardFirehoseEventUseCase.execute(
            request as ProcessCardFirehoseEventDTO,
          );
        case collections.collection:
          return this.processCollectionFirehoseEventUseCase.execute(
            request as ProcessCollectionFirehoseEventDTO,
          );
        case collections.collectionLink:
          return this.processCollectionLinkFirehoseEventUseCase.execute(
            request as ProcessCollectionLinkFirehoseEventDTO,
          );
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
