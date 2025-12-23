import { err, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IAtUriResolutionService } from '../../../domain/services/IAtUriResolutionService';
import { IIdentityResolutionService } from '../../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../../atproto/domain/DIDOrHandle';
import { ATUri } from '../../../../atproto/domain/ATUri';
import {
  GetCollectionPageUseCase,
  GetCollectionPageResult,
  CollectionNotFoundError,
} from './GetCollectionPageUseCase';
import {
  CardSortField,
  SortOrder,
} from 'src/modules/cards/domain/ICardQueryRepository';
import { UrlType } from '../../../domain/value-objects/UrlType';

export interface GetCollectionPageByAtUriQuery {
  handle: string;
  recordKey: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
}

export class GetCollectionPageByAtUriUseCase
  implements
    UseCase<GetCollectionPageByAtUriQuery, Result<GetCollectionPageResult>>
{
  constructor(
    private identityResolutionService: IIdentityResolutionService,
    private atUriResolutionService: IAtUriResolutionService,
    private getCollectionPageUseCase: GetCollectionPageUseCase,
    private collectionString: string,
  ) {}

  async execute(
    query: GetCollectionPageByAtUriQuery,
  ): Promise<Result<GetCollectionPageResult>> {
    // First resolve the handle to a DID
    const identifierResult = DIDOrHandle.create(query.handle);
    if (identifierResult.isErr()) {
      return err(
        new Error(`Invalid handle: ${identifierResult.error.message}`),
      );
    }

    const didResult = await this.identityResolutionService.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new Error(
          `Failed to resolve handle to DID: ${didResult.error.message}`,
        ),
      );
    }

    // Construct the AT URI using the resolved DID
    const atUriResult = ATUri.fromParts(
      didResult.value,
      this.collectionString,
      query.recordKey,
    );
    if (atUriResult.isErr()) {
      return err(
        new Error(`Failed to construct AT URI: ${atUriResult.error.message}`),
      );
    }

    // Resolve the AT URI to a collection ID
    const collectionIdResult =
      await this.atUriResolutionService.resolveCollectionId(
        atUriResult.value.value,
      );

    if (collectionIdResult.isErr()) {
      return err(collectionIdResult.error);
    }

    if (!collectionIdResult.value) {
      return err(
        new CollectionNotFoundError('Collection not found for AT URI'),
      );
    }

    // Delegate to the existing use case
    return this.getCollectionPageUseCase.execute({
      collectionId: collectionIdResult.value.getStringValue(),
      callingUserId: query.callingUserId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      urlType: query.urlType,
    });
  }
}
