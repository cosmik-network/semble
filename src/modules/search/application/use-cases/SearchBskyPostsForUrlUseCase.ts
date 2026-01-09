import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IAgentService } from 'src/modules/atproto/application/IAgentService';
import { DID } from 'src/modules/atproto/domain/DID';
import {
  SearchBskyPostsForUrlParams,
  SearchBskyPostsForUrlResponse,
} from '@semble/types';

export interface SearchBskyPostsForUrlRequest
  extends SearchBskyPostsForUrlParams {
  userDid?: string; // Optional - if provided, use authenticated agent
}

export type SearchBskyPostsForUrlResult = Result<
  SearchBskyPostsForUrlResponse,
  AppError.UnexpectedError
>;

export class SearchBskyPostsForUrlUseCase
  implements
    UseCase<SearchBskyPostsForUrlRequest, Promise<SearchBskyPostsForUrlResult>>
{
  constructor(private agentService: IAgentService) {}

  async execute(
    request: SearchBskyPostsForUrlRequest,
  ): Promise<SearchBskyPostsForUrlResult> {
    try {
      let agentResult;

      // If userDid is provided, try to get authenticated agent for that user
      if (request.userDid) {
        const didResult = DID.create(request.userDid);
        if (didResult.isErr()) {
          return err(new AppError.UnexpectedError(didResult.error));
        }

        agentResult = await this.agentService.getAuthenticatedAgent(
          didResult.value,
        );

        // If user authentication fails, fall back to service account
        if (agentResult.isErr()) {
          agentResult =
            await this.agentService.getAuthenticatedServiceAccountAgent();
        }
      } else {
        // No user authentication, use service account
        agentResult =
          await this.agentService.getAuthenticatedServiceAccountAgent();
      }

      if (agentResult.isErr()) {
        return err(new AppError.UnexpectedError(agentResult.error));
      }

      const agent = agentResult.value;

      // Prepare search parameters
      const searchParams: any = {
        q: request.q,
      };

      // Add optional parameters if provided
      if (request.sort) searchParams.sort = request.sort;
      if (request.since) searchParams.since = request.since;
      if (request.until) searchParams.until = request.until;
      if (request.mentions) searchParams.mentions = request.mentions;
      if (request.author) searchParams.author = request.author;
      if (request.lang) searchParams.lang = request.lang;
      if (request.domain) searchParams.domain = request.domain;
      if (request.url) searchParams.url = request.url;
      if (request.tag) searchParams.tag = request.tag;
      if (request.limit) searchParams.limit = request.limit;
      if (request.cursor) searchParams.cursor = request.cursor;

      // Make the search request
      const searchResponse =
        await agent.app.bsky.feed.searchPosts(searchParams);

      if (!searchResponse.success) {
        return err(
          new AppError.UnexpectedError(new Error('Search request failed')),
        );
      }

      return ok({
        cursor: searchResponse.data.cursor,
        hitsTotal: searchResponse.data.hitsTotal,
        posts: searchResponse.data.posts as any, // Type assertion to handle API type differences
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
