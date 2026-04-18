import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { SearchUrlsUseCase } from '../../../../cards/application/useCases/queries/SearchUrlsUseCase';
import { SearchCollectionsUseCase } from '../../../../cards/application/useCases/queries/SearchCollectionsUseCase';
import {
  CardSortField,
  SortOrder,
} from '../../../../cards/domain/ICardQueryRepository';
import {
  CollectionSortField,
  SortOrder as CollectionSortOrder,
} from '../../../../cards/domain/ICollectionQueryRepository';
import { ATUri } from '../../../../atproto/domain/ATUri';
import { DIDOrATUri } from '../../../../atproto/domain/DIDOrATUri';
import { IAtUriResolutionService } from '../../../../cards/domain/services/IAtUriResolutionService';
import { DID } from '../../../../atproto/domain/DID';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';

// XRPC parts.page.mention.search types based on lexicon
export interface XrpcMentionLabel {
  text: string;
}

export interface XrpcEmbedInfo {
  src: string;
  width?: number;
  height?: number;
  aspectRatio?: {
    height: number;
    width: number;
  };
}

export interface XrpcSubscopeInfo {
  scope: string;
  label: string;
}

export interface XrpcMentionSearchResult {
  uri: string;
  name: string;
  description?: string;
  labels?: XrpcMentionLabel[];
  href?: string;
  icon?: string;
  embed?: XrpcEmbedInfo;
  subscope?: XrpcSubscopeInfo;
}

export interface XrpcMentionSearchResponse {
  results: XrpcMentionSearchResult[];
}

export interface XrpcMentionSearchQuery {
  service: string;
  search: string;
  scope?: string;
  limit: number;
  callingUserId?: string;
  appUrl: string;
}

// Service AT URIs for different search types
const COLLECTION_SEARCH_SERVICE =
  'at://did:plc:b2p6rujcgpenbtcjposmjuc3/parts.page.mention.service/3miho3xyx3c26';
const CARD_SEARCH_SERVICE =
  'at://did:plc:b2p6rujcgpenbtcjposmjuc3/parts.page.mention.service/3mihdrfdo5p23';

/**
 * Encapsulates the logic for determining search parameters based on service type and scope
 */
class MentionSearchContext {
  private parsedScope?: DIDOrATUri;
  private scopeIdentifier?: string;

  constructor(
    private serviceUri: string,
    private scope: string | undefined,
    private search: string,
    private callingUserId: string | undefined,
  ) {}

  async initialize(): Promise<Result<void, UseCaseError>> {
    if (!this.scope) {
      return ok(undefined);
    }

    const scopeResult = DIDOrATUri.create(this.scope);
    if (scopeResult.isErr()) {
      return err(
        new ValidationError(
          `Invalid scope parameter: ${scopeResult.error.message}`,
        ),
      );
    }

    this.parsedScope = scopeResult.value;

    // Extract the identifier (DID) from the scope
    if (this.parsedScope.isDID) {
      this.scopeIdentifier = this.parsedScope.getDID()?.value;
    } else {
      // If it's an AT URI, extract the DID from it
      this.scopeIdentifier = this.parsedScope.getATUri()?.did.value;
    }

    return ok(undefined);
  }

  isCollectionSearch(): boolean {
    return (
      this.serviceUri === COLLECTION_SEARCH_SERVICE &&
      !this.parsedScope?.isATUri
    );
  }

  isCardSearch(): boolean {
    return (
      this.serviceUri === CARD_SEARCH_SERVICE ||
      this.serviceUri === COLLECTION_SEARCH_SERVICE
    );
  }

  isValidService(): boolean {
    return (
      this.serviceUri === COLLECTION_SEARCH_SERVICE ||
      this.serviceUri === CARD_SEARCH_SERVICE
    );
  }

  /**
   * For collection search:
   * - If a DID scope is passed, use that as the identifier
   * - If no scope is passed and search is empty, use the calling user's DID
   * - Otherwise, don't pass an identifier (search across all collections)
   */
  getCollectionSearchIdentifier(): string | undefined {
    if (this.parsedScope?.isDID) {
      return this.scopeIdentifier;
    }
    if (!this.search) {
      return this.callingUserId;
    }
    return undefined;
  }

  /**
   * For card search:
   * - If scope is a DID, use as authorDid filter
   * - If scope is an AT URI, resolve to CollectionId
   * - If no scope and empty search, scope to calling user's cards
   */
  async getCardSearchFilters(
    atUriResolutionService: IAtUriResolutionService,
  ): Promise<
    Result<
      { authorDid?: DID; collectionId?: CollectionId },
      AppError.UnexpectedError
    >
  > {
    let authorDid: DID | undefined;
    let collectionId: CollectionId | undefined;

    if (this.scope) {
      if (this.parsedScope!.isDID) {
        authorDid = this.parsedScope!.getDID();
      } else {
        const atUri = this.parsedScope!.getATUri();
        if (atUri) {
          const collectionIdResult =
            await atUriResolutionService.resolveCollectionId(atUri.toString());
          if (collectionIdResult.isErr()) {
            return err(collectionIdResult.error);
          }
          if (collectionIdResult.value) {
            collectionId = collectionIdResult.value;
          }
        }
      }
    } else if (!this.search && this.callingUserId) {
      const callingUserDidResult = DID.create(this.callingUserId);
      if (callingUserDidResult.isOk()) {
        authorDid = callingUserDidResult.value;
      }
    }

    return ok({ authorDid, collectionId });
  }
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class XrpcMentionSearchUseCase
  implements
    UseCase<
      XrpcMentionSearchQuery,
      Result<
        XrpcMentionSearchResponse,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private searchUrlsUseCase: SearchUrlsUseCase,
    private searchCollectionsUseCase: SearchCollectionsUseCase,
    private atUriResolutionService: IAtUriResolutionService,
  ) {}

  async execute(
    query: XrpcMentionSearchQuery,
  ): Promise<
    Result<
      XrpcMentionSearchResponse,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Create and initialize search context
      const context = new MentionSearchContext(
        query.service,
        query.scope,
        query.search,
        query.callingUserId,
      );

      const initResult = await context.initialize();
      if (initResult.isErr()) {
        return err(initResult.error);
      }

      // Validate service URI
      if (!context.isValidService()) {
        return err(
          new ValidationError(
            `Unknown service URI: ${query.service}. Expected ${CARD_SEARCH_SERVICE} or ${COLLECTION_SEARCH_SERVICE}`,
          ),
        );
      }

      // Route to appropriate search handler
      if (context.isCollectionSearch()) {
        return this.handleCollectionSearch(query, context);
      } else {
        return this.handleCardSearch(query, context);
      }
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleCollectionSearch(
    query: XrpcMentionSearchQuery,
    context: MentionSearchContext,
  ): Promise<
    Result<
      XrpcMentionSearchResponse,
      ValidationError | AppError.UnexpectedError
    >
  > {
    const result = await this.searchCollectionsUseCase.execute({
      searchText: query.search || '',
      callingUserId: query.callingUserId,
      identifier: context.getCollectionSearchIdentifier(),
      page: 1,
      limit: query.limit,
      sortBy: CollectionSortField.UPDATED_AT,
      sortOrder: CollectionSortOrder.DESC,
    });

    if (result.isErr()) {
      return err(AppError.UnexpectedError.create(result.error));
    }

    const mappedResults: XrpcMentionSearchResult[] = [];

    for (const collection of result.value.collections) {
      if (!collection.uri) {
        continue;
      }

      const atUriResult = ATUri.create(collection.uri);
      if (atUriResult.isErr()) {
        console.error(`Failed to parse collection AT URI: ${collection.uri}`);
        continue;
      }

      const atUri = atUriResult.value;
      const handle = collection.author.handle;

      mappedResults.push({
        uri: collection.uri,
        name: collection.name,
        description: collection.description,
        href: `${query.appUrl}/profile/${handle}/collections/${atUri.rkey}`,
        subscope: {
          scope: collection.uri,
          label: 'Cards',
        },
        labels: [
          {
            text: `by ${handle}`,
          },
          { text: `${collection.cardCount} cards` },
        ],
        embed: {
          src: `${query.appUrl}/profile/${handle}/collections/${atUri.rkey}/page-parts-embed`,
          aspectRatio: {
            height: 9,
            width: 21,
          },
        },
      });
    }

    return ok({ results: mappedResults });
  }

  private async handleCardSearch(
    query: XrpcMentionSearchQuery,
    context: MentionSearchContext,
  ): Promise<
    Result<
      XrpcMentionSearchResponse,
      ValidationError | AppError.UnexpectedError
    >
  > {
    const filtersResult = await context.getCardSearchFilters(
      this.atUriResolutionService,
    );
    if (filtersResult.isErr()) {
      return err(filtersResult.error);
    }

    const { authorDid, collectionId } = filtersResult.value;

    const result = await this.searchUrlsUseCase.execute({
      searchQuery: query.search || '',
      callingUserId: query.callingUserId,
      page: 1,
      limit: query.limit,
      sortBy: CardSortField.UPDATED_AT,
      sortOrder: SortOrder.DESC,
      authorDid,
      collectionId,
    });

    if (result.isErr()) {
      return err(AppError.UnexpectedError.create(result.error));
    }

    const mappedResults: XrpcMentionSearchResult[] = result.value.urls.map(
      (urlView) => ({
        uri: urlView.url,
        name: urlView.metadata.title || urlView.url,
        description: urlView.metadata.description,
        href: `${query.appUrl}/url?id=${encodeURIComponent(urlView.url)}`,
        icon: urlView.metadata.imageUrl,
      }),
    );

    return ok({ results: mappedResults });
  }
}
