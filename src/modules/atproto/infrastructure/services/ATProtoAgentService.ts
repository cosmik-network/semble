import { createPdsAgent } from './PdsAgent';
import { AtpAgent, Agent } from '@atproto/api';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { IdResolver } from '@atproto/identity';
import { Result, ok, err } from 'src/shared/core/Result';
import { IAgentService } from '../../application/IAgentService';
import { DID } from '../../domain/DID';
import { IAppPasswordSessionService } from '../../application/IAppPasswordSessionService';
import { ATPROTO_SERVICE_ENDPOINTS } from './ServiceEndpoints';
import {
  AuthenticationError,
  PdsUnavailableError,
} from 'src/shared/core/AuthenticationError';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { reportPdsAuthFailure } from './pdsAuthFailure';

// How long to short-circuit restore() attempts for a DID whose OAuth session
// is known to be gone. Kept short so a re-login on another machine (which we
// can't observe via events) is picked up quickly; on this machine the
// 'updated' event clears the entry immediately.
const DEAD_SESSION_TTL_MS = 60_000;

// Upper bound for unauthenticated appview/PDS calls. These are read-only
// lookups (handle resolution, public profiles); a degraded upstream must
// fail fast instead of holding inbound requests open for minutes.
const UNAUTHENTICATED_FETCH_TIMEOUT_MS = 5_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(UNAUTHENTICATED_FETCH_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
}

export class ATProtoAgentService implements IAgentService {
  /** DID -> negative-cache expiry timestamp (ms). */
  private readonly deadOAuthSessions = new Map<string, number>();

  constructor(
    private readonly oauthClient: NodeOAuthClient,
    private readonly appPasswordSessionService: IAppPasswordSessionService,
    private readonly configService: EnvironmentConfigService,
  ) {
    // A stored/refreshed session (incl. after an OAuth callback re-login)
    // invalidates the negative cache for that DID.
    this.oauthClient.addEventListener('updated', (event) => {
      this.deadOAuthSessions.delete(event.detail.sub);
    });
  }
  getUnauthenticatedAgent(): Result<Agent, Error> {
    return ok(
      new Agent({
        service: ATPROTO_SERVICE_ENDPOINTS.UNAUTHENTICATED_BSKY_SERVICE,
        fetch: fetchWithTimeout,
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
          fetch: fetchWithTimeout,
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
        // A retryable OAuth failure must stay retryable: wrapping it in a
        // plain AuthenticationError would log the user out over a blip.
        if (oauthAgentResult.error instanceof PdsUnavailableError) {
          return oauthAgentResult;
        }
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
    // Negative cache: once a session is known dead, every restore() attempt
    // re-fires the library's 'deleted' event and hits the store for nothing.
    // Short-circuit until the TTL lapses or an 'updated' event clears it.
    const deadUntil = this.deadOAuthSessions.get(did.value);
    if (deadUntil !== undefined) {
      if (Date.now() < deadUntil) {
        return err(
          new AuthenticationError(
            'OAuth authentication failed: session recently found missing or revoked (negative cache)',
          ),
        );
      }
      this.deadOAuthSessions.delete(did.value);
    }

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
      // Only session-terminal failures are negative-cached: a missing row or
      // a rejected/revoked refresh token stays dead until the user
      // re-authenticates. Transient failures (network, PDS 5xx) must NOT
      // deny agents for the TTL.
      const failure = reportPdsAuthFailure('oauth_restore', did.value, error);
      if (failure.terminal) {
        this.deadOAuthSessions.set(did.value, Date.now() + DEAD_SESSION_TTL_MS);
      }
      const message = `OAuth authentication failed: ${failure.causeChain}`;
      return err(
        failure.requiresReauth
          ? new AuthenticationError(message)
          : new PdsUnavailableError(message),
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
        const { agent } = await createPdsAgent(did.value);

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
          const { agent } = await createPdsAgent(session.did);
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
      const { agent } = await createPdsAgent(session.did);
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
