import { AtpAgent, Agent } from '@atproto/api';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { IdResolver } from '@atproto/identity';
import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { IAppPasswordSessionService } from '../../application/IAppPasswordSessionService';
import { ATPROTO_SERVICE_ENDPOINTS } from './ServiceEndpoints';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

export class ATProtoAgentService implements IAgentService {
  constructor(
    private readonly oauthClient: NodeOAuthClient,
    private readonly appPasswordSessionService: IAppPasswordSessionService,
    private readonly configService: EnvironmentConfigService,
  ) {}
  getUnauthenticatedAgent(): Result<Agent, Error> {
    return ok(
      new Agent({
        service: ATPROTO_SERVICE_ENDPOINTS.UNAUTHENTICATED_BSKY_SERVICE,
      }),
    );
  }

  async getUnauthenticatedAgentForDid(did: DID): Promise<Result<Agent, Error>> {
    try {
      // Create an IdResolver to resolve DID documents
      const idResolver = new IdResolver();

      // Resolve the DID to a DID document
      const didDoc = await idResolver.did.resolve(did.value);

      if (!didDoc) {
        return err(
          new Error(`Failed to resolve DID document for ${did.value}`),
        );
      }

      // Extract the PDS endpoint from the service array
      const pdsService = didDoc.service?.find((s) => s.id === '#atproto_pds');

      if (!pdsService || !pdsService.serviceEndpoint) {
        return err(
          new Error(`No PDS endpoint found in DID document for ${did.value}`),
        );
      }

      // Ensure serviceEndpoint is a string
      const pdsEndpoint =
        typeof pdsService.serviceEndpoint === 'string'
          ? pdsService.serviceEndpoint
          : String(pdsService.serviceEndpoint);

      // Create and return an unauthenticated Agent with the PDS endpoint
      return ok(
        new Agent({
          service: pdsEndpoint,
        }),
      );
    } catch (error) {
      return err(
        new Error(
          `Failed to get unauthenticated agent for DID: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getAuthenticatedAgent(did: DID): Promise<Result<Agent, Error>> {
    const oauthAgentResult =
      await this.getAuthenticatedAgentByOAuthSession(did);
    if (oauthAgentResult.isErr()) {
      // If OAuth session fails, try App Password session
      const appPasswordAgentResult =
        await this.getAuthenticatedAgentByAppPasswordSession(did);
      if (appPasswordAgentResult.isErr()) {
        return err(
          new AuthenticationError(
            `Failed to authenticate: No valid OAuth or App Password session found. OAuth error: ${oauthAgentResult.error.message}. App Password error: ${appPasswordAgentResult.error.message}`,
          ),
        );
      }
      return appPasswordAgentResult;
    }
    return oauthAgentResult;
  }
  async getAuthenticatedAgentByOAuthSession(
    did: DID,
  ): Promise<Result<Agent, Error>> {
    try {
      // Try to restore the session for the DID
      const oauthSession = await this.oauthClient.restore(did.value);

      // If we have a session, create and return an Agent
      if (oauthSession) {
        return ok(new Agent(oauthSession));
      }

      // No session found
      throw new AuthenticationError(
        'No OAuth session found for the provided DID',
      );
    } catch (error) {
      return err(
        new AuthenticationError(
          `OAuth authentication failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
  async getAuthenticatedAgentByAppPasswordSession(
    did: DID,
  ): Promise<Result<Agent, Error>> {
    try {
      // Try to restore the session for the DID
      const appPasswordSessionResult =
        await this.appPasswordSessionService.getSession(did.value);

      if (appPasswordSessionResult.isErr()) {
        return err(
          new AuthenticationError(
            `App Password session failed: ${appPasswordSessionResult.error.message}`,
          ),
        );
      }

      const session = appPasswordSessionResult.value;
      if (session) {
        // Create an Agent with the session
        const agent = new AtpAgent({
          service: ATPROTO_SERVICE_ENDPOINTS.AUTHENTICATED_BSKY_SERVICE,
        });

        // Resume the session
        await agent.resumeSession(session);

        // Return the authenticated agent
        return ok(agent);
      }

      // No session found
      throw new AuthenticationError(
        'No App Password session found for the provided DID',
      );
    } catch (error) {
      return err(
        new AuthenticationError(
          `App Password authentication failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async getAuthenticatedServiceAccountAgent(): Promise<Result<Agent, Error>> {
    try {
      const serviceAccount = this.configService.getAtProtoServiceAccount();

      if (!serviceAccount.identifier || !serviceAccount.appPassword) {
        return err(
          new AuthenticationError(
            'Service account credentials not configured. Please set BSKY_SERVICE_ACCOUNT_IDENTIFIER and BSKY_SERVICE_ACCOUNT_APP_PASSWORD environment variables.',
          ),
        );
      }

      // First try to get existing session using the service account identifier as DID
      // We need to convert the identifier to a DID format for session lookup
      let serviceAccountDid: string;

      // If identifier is already a DID, use it directly
      if (serviceAccount.identifier.startsWith('did:')) {
        serviceAccountDid = serviceAccount.identifier;
      } else {
        // For handles, we need to resolve to DID first by creating a session
        // This will be handled in the createSession fallback below
        serviceAccountDid = serviceAccount.identifier;
      }

      // Try to get existing session first (only if we have a proper DID)
      if (serviceAccountDid.startsWith('did:')) {
        const existingSessionResult =
          await this.appPasswordSessionService.getSession(serviceAccountDid);
        if (existingSessionResult.isOk()) {
          const session = existingSessionResult.value;
          const agent = new AtpAgent({
            service: ATPROTO_SERVICE_ENDPOINTS.AUTHENTICATED_BSKY_SERVICE,
          });
          await agent.resumeSession(session);
          return ok(agent);
        }
      }

      // If no existing session or session failed, create a new one
      const newSessionResult =
        await this.appPasswordSessionService.createSession(
          serviceAccount.identifier,
          serviceAccount.appPassword,
        );

      if (newSessionResult.isErr()) {
        return err(
          new AuthenticationError(
            `Failed to create service account session: ${newSessionResult.error.message}`,
          ),
        );
      }

      const session = newSessionResult.value;
      const agent = new AtpAgent({
        service: ATPROTO_SERVICE_ENDPOINTS.AUTHENTICATED_BSKY_SERVICE,
      });
      await agent.resumeSession(session);

      return ok(agent);
    } catch (error) {
      return err(
        new AuthenticationError(
          `Service account authentication failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
