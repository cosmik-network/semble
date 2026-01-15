import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IAgentService } from 'src/modules/atproto/application/IAgentService';
import { DID } from 'src/modules/atproto/domain/DID';
import {
  SearchAtProtoAccountsParams,
  SearchAtProtoAccountsResponse,
} from '@semble/types';

export interface SearchAtProtoAccountsRequest
  extends SearchAtProtoAccountsParams {
  userDid?: string; // Optional - if provided, use authenticated agent
}

export type SearchAtProtoAccountsResult = Result<
  SearchAtProtoAccountsResponse,
  AppError.UnexpectedError
>;

export class SearchAtProtoAccountsUseCase
  implements
    UseCase<SearchAtProtoAccountsRequest, Promise<SearchAtProtoAccountsResult>>
{
  constructor(private agentService: IAgentService) {}

  async execute(
    request: SearchAtProtoAccountsRequest,
  ): Promise<SearchAtProtoAccountsResult> {
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
        if (agentResult.isOk() && !agentResult.value.sessionManager?.did) {
          console.log(
            'Fallback to service account due to missing DID in session - IN MOCK MODE ONLY',
          );
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
      const searchParams: any = {};

      // Add optional parameters if provided
      if (request.term) searchParams.term = request.term;
      if (request.q) searchParams.q = request.q;
      if (request.limit) searchParams.limit = request.limit;
      if (request.cursor) searchParams.cursor = request.cursor;

      // Make the search request
      const searchResponse =
        await agent.app.bsky.actor.searchActors(searchParams);

      if (!searchResponse.success) {
        return err(
          new AppError.UnexpectedError(new Error('Search request failed')),
        );
      }

      return ok({
        cursor: searchResponse.data.cursor,
        actors: searchResponse.data.actors as any, // Type assertion to handle API type differences
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
