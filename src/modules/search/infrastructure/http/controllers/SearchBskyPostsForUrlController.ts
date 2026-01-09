import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { SearchBskyPostsForUrlUseCase } from '../../../application/use-cases/SearchBskyPostsForUrlUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class SearchBskyPostsForUrlController extends Controller {
  constructor(private searchBskyPostsForUrlUseCase: SearchBskyPostsForUrlUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const {
        q,
        sort,
        since,
        until,
        mentions,
        author,
        lang,
        domain,
        url,
        tag,
        limit,
        cursor,
      } = req.query;

      if (!q || typeof q !== 'string') {
        return this.badRequest(res, 'Query parameter "q" is required');
      }

      // Parse tag parameter if it's a string (convert to array)
      let tagArray: string[] | undefined;
      if (tag) {
        if (typeof tag === 'string') {
          tagArray = [tag];
        } else if (Array.isArray(tag)) {
          tagArray = tag.filter((t): t is string => typeof t === 'string');
        }
      }

      const result = await this.searchBskyPostsForUrlUseCase.execute({
        q,
        sort: sort as string | undefined,
        since: since as string | undefined,
        until: until as string | undefined,
        mentions: mentions as string | undefined,
        author: author as string | undefined,
        lang: lang as string | undefined,
        domain: domain as string | undefined,
        url: url as string | undefined,
        tag: tagArray,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        cursor: cursor as string | undefined,
        userDid: req.did, // This will be undefined if not authenticated
      });

      if (result.isErr()) {
        return this.fail(res, result.error.message);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error.message || 'Unknown error');
    }
  }
}
