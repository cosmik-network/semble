import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { SearchUrlsUseCase } from '../../../../cards/application/useCases/queries/SearchUrlsUseCase';
import { GetUrlCardsUseCase } from '../../../../cards/application/useCases/queries/GetUrlCardsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import {
  CardSortField,
  SortOrder,
} from '../../../../cards/domain/ICardQueryRepository';
import { parseReqNsid, verifyJwt } from '@atproto/xrpc-server';
import { IdResolver } from '@atproto/identity';

interface XrpcMentionSearchResult {
  uri: string;
  name: string;
  href: string;
  icon?: string;
  embed?: {
    src: string;
    width: number;
    height: number;
  };
}

export class XrpcMentionSearchController extends Controller {
  private idResolver: IdResolver;

  constructor(
    private searchUrlsUseCase: SearchUrlsUseCase,
    private getUrlCardsUseCase: GetUrlCardsUseCase,
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

      // If search query is empty
      if (!search || search.trim() === '') {
        // If not authenticated, return empty results
        if (!callingUserId) {
          return this.ok(res, { results: [] });
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
            embed: undefined,
          }),
        );

        return this.ok(res, { results: mappedResults });
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
          embed: undefined,
        }),
      );

      return this.ok(res, { results: mappedResults });
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
