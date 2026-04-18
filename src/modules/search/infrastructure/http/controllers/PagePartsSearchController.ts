import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { XrpcMentionSearchUseCase } from '../../../application/useCases/queries/PagePartsSearchUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { parseReqNsid, verifyJwt } from '@atproto/xrpc-server';
import { IIdentityResolutionService } from '../../../../../modules/atproto/domain/services/IIdentityResolutionService';

export class XrpcMentionSearchController extends Controller {
  constructor(
    private xrpcMentionSearchUseCase: XrpcMentionSearchUseCase,
    private appUrl: string,
    private serviceDid: string,
    private identityResolutionService: IIdentityResolutionService,
  ) {
    super();
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
          const keyResult =
            await this.identityResolutionService.resolveAtprotoKey(did);
          if (keyResult.isErr()) {
            throw new Error(
              `Could not resolve atproto key: ${keyResult.error.message}`,
            );
          }
          return keyResult.value;
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

      const result = await this.xrpcMentionSearchUseCase.execute({
        service: serviceUri,
        search: search || '',
        scope,
        limit,
        callingUserId,
        appUrl: this.appUrl,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
