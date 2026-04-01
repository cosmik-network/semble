import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { SearchUrlsUseCase } from '../../../../cards/application/useCases/queries/SearchUrlsUseCase';
import { GetUrlCardsUseCase } from '../../../../cards/application/useCases/queries/GetUrlCardsUseCase';
import { SearchCollectionsUseCase } from '../../../../cards/application/useCases/queries/SearchCollectionsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import {
  CardSortField,
  SortOrder,
} from '../../../../cards/domain/ICardQueryRepository';
import {
  CollectionSortField,
  SortOrder as CollectionSortOrder,
} from '../../../../cards/domain/ICollectionQueryRepository';
import { parseReqNsid, verifyJwt } from '@atproto/xrpc-server';
import { IdResolver } from '@atproto/identity';
import { ATUri } from '../../../../atproto/domain/ATUri';
import { DIDOrATUri } from '../../../../atproto/domain/DIDOrATUri';

// XRPC parts.page.mention.search types based on lexicon
interface XrpcMentionSearchParams {
  service: string; // AT URI of the mention service
  search: string; // Search query string
  scope?: string; // Optional scope identifier
  limit?: number; // Max 50, default 20
}

interface XrpcMentionLabel {
  text: string;
}

interface XrpcEmbedInfo {
  src: string; // iframe source URL
  width?: number; // 16-3200 pixels
  height?: number; // 16-3200 pixels
}

interface XrpcSubscopeInfo {
  scope: string; // Scope identifier for subsequent queries
  label: string; // Display label (max 100 chars)
}

interface XrpcMentionSearchResult {
  uri: string; // Identifier for the mentioned entity
  name: string; // Display name
  description?: string; // Description
  labels?: XrpcMentionLabel[]; // Labels to render with entity
  href?: string; // Optional web URL
  icon?: string; // Optional icon URL
  embed?: XrpcEmbedInfo; // Optional embed info
  subscope?: XrpcSubscopeInfo; // Optional subscope info
}

interface XrpcMentionSearchResponse {
  results: XrpcMentionSearchResult[]; // Max 50 results
}

// Service AT URIs for different search types
const COLLECTION_SEARCH_SERVICE =
  'at://did:plc:b2p6rujcgpenbtcjposmjuc3/parts.page.mention.service/3miho3xyx3c26';
const CARD_SEARCH_SERVICE =
  'at://did:plc:b2p6rujcgpenbtcjposmjuc3/parts.page.mention.service/3mihdrfdo5p23';

export class XrpcMentionSearchController extends Controller {
  private idResolver: IdResolver;

  constructor(
    private searchUrlsUseCase: SearchUrlsUseCase,
    private getUrlCardsUseCase: GetUrlCardsUseCase,
    private searchCollectionsUseCase: SearchCollectionsUseCase,
    private appUrl: string,
    private serviceDid: string,
  ) {
    super();
    this.idResolver = new IdResolver();
  }

  private async validateAuth(req: any): Promise<string | undefined> {
    const authorization = req.headers?.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const jwt = authorization.replace('Bearer ', '').trim();
      const nsid = parseReqNsid(req);
      const parsed = await verifyJwt(
        jwt,
        this.serviceDid,
        nsid,
        async (did: string) => {
          const didDoc = await this.idResolver.did.resolve(did);
          if (!didDoc) {
            throw new Error('Could not resolve DID');
          }
          return await this.idResolver.did.resolveAtprotoKey(did);
        },
      );
      return parsed.iss;
    } catch (error) {
      // Authentication failed, but we allow unauthenticated requests
      console.error('JWT verification failed:', error);
      return undefined;
    }
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const serviceUri = req.query.service as string;
      const search = req.query.search as string;
      const scope = req.query.scope as string | undefined;
      const limit = Math.min(
        Math.max(parseInt((req.query.limit as string) || '20'), 1),
        50,
      );

      if (!serviceUri) {
        return this.badRequest(res, 'missing required parameter: service');
      }

      // Validate JWT and extract DID (optional)
      const callingUserId = await this.validateAuth(req);

      // Validate and parse scope if provided
      let scopeIdentifier: string | undefined;
      let scopeIsDID = false;
      if (scope) {
        const scopeResult = DIDOrATUri.create(scope);
        if (scopeResult.isErr()) {
          return this.badRequest(
            res,
            `Invalid scope parameter: ${scopeResult.error.message}`,
          );
        }

        const parsedScope = scopeResult.value;
        // Extract the identifier (DID) from the scope
        if (parsedScope.isDID) {
          scopeIdentifier = parsedScope.getDID()?.value;
          scopeIsDID = true;
        } else {
          // If it's an AT URI, extract the DID from it
          scopeIdentifier = parsedScope.getATUri()?.did.value;
        }
      }

      // Branch based on service type
      if (serviceUri === COLLECTION_SEARCH_SERVICE) {
        // Collection search
        const result = await this.searchCollectionsUseCase.execute({
          searchText: search || '',
          callingUserId,
          identifier: scopeIsDID ? scopeIdentifier : undefined, // Pass the scope identifier
          page: 1,
          limit,
          sortBy: CollectionSortField.UPDATED_AT,
          sortOrder: CollectionSortOrder.DESC,
        });

        if (result.isErr()) {
          return this.fail(res, result.error);
        }

        const mappedResults: XrpcMentionSearchResult[] = [];

        for (const collection of result.value.collections) {
          // Parse the collection AT URI to get the rkey
          if (!collection.uri) {
            continue; // Skip collections without AT URIs
          }

          const atUriResult = ATUri.create(collection.uri);
          if (atUriResult.isErr()) {
            console.error(
              `Failed to parse collection AT URI: ${collection.uri}`,
            );
            continue;
          }

          const atUri = atUriResult.value;
          const handle = collection.author.handle;

          mappedResults.push({
            uri: collection.uri,
            name: collection.name,
            description: collection.description,
            href: `${this.appUrl}/profile/${handle}/collections/${atUri.rkey}`,
          });
        }

        const response: XrpcMentionSearchResponse = { results: mappedResults };
        return this.ok(res, response);
      }

      if (serviceUri !== CARD_SEARCH_SERVICE) {
        return this.badRequest(
          res,
          `Unknown service URI: ${serviceUri}. Expected ${CARD_SEARCH_SERVICE} or ${COLLECTION_SEARCH_SERVICE}`,
        );
      }

      // Card search service
      // If search query is empty
      if (!search || search.trim() === '') {
        // If not authenticated, return empty results
        if (!callingUserId) {
          const emptyResponse: XrpcMentionSearchResponse = { results: [] };
          return this.ok(res, emptyResponse);
        }

        // Fetch user's recent cards
        const result = await this.getUrlCardsUseCase.execute({
          userId: callingUserId,
          callingUserId,
          page: 1,
          limit,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        });

        if (result.isErr()) {
          return this.fail(res, result.error);
        }

        const mappedResults: XrpcMentionSearchResult[] = result.value.cards.map(
          (card) => ({
            uri: card.url,
            name: card.cardContent.title || card.url,
            description: card.cardContent.description,
            href: `${this.appUrl}/url?id=${encodeURIComponent(card.url)}`,
            icon: card.cardContent.imageUrl,
          }),
        );

        const response: XrpcMentionSearchResponse = { results: mappedResults };
        return this.ok(res, response);
      }

      // Perform search with query string
      const result = await this.searchUrlsUseCase.execute({
        searchQuery: search,
        callingUserId,
        page: 1,
        limit,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      const mappedResults: XrpcMentionSearchResult[] = result.value.urls.map(
        (urlView) => ({
          uri: urlView.url,
          name: urlView.metadata.title || urlView.url,
          description: urlView.metadata.description,
          href: `${this.appUrl}/url?id=${encodeURIComponent(urlView.url)}`,
          icon: urlView.metadata.imageUrl,
        }),
      );

      const response: XrpcMentionSearchResponse = { results: mappedResults };
      return this.ok(res, response);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
