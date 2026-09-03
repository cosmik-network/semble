import {
  NodeOAuthClient,
  OAuthClientMetadataInput,
  NodeSavedStateStore,
  NodeSavedSessionStore,
} from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { configService } from 'src/shared/infrastructure/config';
import { LockServiceFactory } from 'src/shared/infrastructure/locking';
import { paths } from '@semble/types';

export class OAuthClientFactory {
  static getClientMetadata(
    baseUrl: string,
    appName: string = 'Semble',
  ): { clientMetadata: OAuthClientMetadataInput; useConfidential: boolean } {
    const url = baseUrl || 'http://127.0.0.1:3000';
    const enc = encodeURIComponent;
    const isTunnel = configService.isTunnelMode();
    const isLocal = configService.get().environment === 'local' && !isTunnel;
    const isProd = configService.get().environment === 'prod';
    const useConfidential = this.isConfidentialEnabled(isLocal, isProd);

    const collections = configService.getAtProtoCollections();

    const cosmikCollections = [
      collections.card,
      collections.collection,
      collections.collectionLink,
      collections.follow,
      collections.collectionLinkRemoval,
      collections.connection,
    ]
      .map((c) => `collection=${c}`)
      .join('&');

    const scope = [
      'atproto',
      `repo?${cosmikCollections}`,
      'repo:at.margin.collection?action=update&action=delete',
      'repo:at.margin.collectionItem?action=delete',
      'rpc:app.bsky.feed.searchPosts?aud=*',
      'rpc:app.bsky.actor.searchActors?aud=*',
      'rpc:app.bsky.actor.getProfile?aud=*',
      'rpc:app.bsky.graph.getFollows?aud=*',
    ].join(' ');

    // OAuth spec requires client_uri to share its origin with client_id.
    // In tunnel mode client_id lives on the backend host, so client_uri must
    // also be the backend host — pointing it at the frontend host fails PAR
    // with "client_uri must have the same origin as the client_id".
    const clientUri = url;

    return {
      clientMetadata: {
        client_name: appName,
        client_id: !isLocal
          ? `${url}/oauth-client-metadata.json`
          : `http://localhost?redirect_uri=${enc(`${baseUrl}/api${paths.oauthCallback}`)}&scope=${enc(scope)}`,
        client_uri: clientUri,
        redirect_uris: [`${baseUrl}/api${paths.oauthCallback}`],
        scope,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        application_type: 'web',
        // Confidential clients get a 2-year PDS session cap and a 3-month
        // refresh-inactivity window instead of the 2-week hard cap public
        // clients get. The auth server requires token_endpoint_auth_signing_alg
        // with private_key_jwt and rejects it with 'none', so the two fields
        // must flip together. jwks is set in createClient once the key is
        // loaded (never jwks_uri as well — the PDS rejects metadata carrying
        // both).
        token_endpoint_auth_method: useConfidential
          ? 'private_key_jwt'
          : 'none',
        ...(useConfidential
          ? { token_endpoint_auth_signing_alg: 'ES256' }
          : {}),
        dpop_bound_access_tokens: true,
      },
      useConfidential,
    };
  }

  /**
   * Confidential (private_key_jwt) mode is enabled only where a signing key
   * is configured, and never for:
   * - local (loopback client_ids can't host a metadata/JWKS document), or
   * - prod (deliberately still a public client; flipping prod requires the
   *   auth_session authMethod migration and must be an explicit code change).
   */
  private static isConfidentialEnabled(
    isLocal: boolean,
    isProd: boolean,
  ): boolean {
    if (isLocal || isProd) return false;
    const { privateKeyPkcs8, keyId } = configService.getOAuthClientConfig();
    return Boolean(privateKeyPkcs8 && keyId);
  }

  /**
   * PDS sessions created (or upgraded) under private_key_jwt are pinned to
   * this key's kid on both ends: the client stores the kid in the session and
   * throws AuthMethodUnsatisfiableError (deleting the session) if it leaves
   * the keyset, and the auth server rejects refreshes signed with any other
   * key. Removing or replacing this key therefore force-logs-out every
   * session pinned to it — treat rotation as a deliberate mass re-auth event,
   * not routine hygiene.
   */
  private static async loadSigningKey(): Promise<JoseKey> {
    const { privateKeyPkcs8, keyId } = configService.getOAuthClientConfig();
    if (!privateKeyPkcs8 || !keyId) {
      throw new Error(
        'OAuth signing key requested but OAUTH_PRIVATE_KEY_PKCS8 / OAUTH_KEY_ID are not configured',
      );
    }
    return JoseKey.fromPKCS8(privateKeyPkcs8, 'ES256', keyId);
  }

  static async createClient(
    stateStore: NodeSavedStateStore,
    sessionStore: NodeSavedSessionStore,
    baseUrl: string,
    appName: string = 'Semble',
  ): Promise<NodeOAuthClient> {
    const { clientMetadata, useConfidential } = this.getClientMetadata(
      baseUrl,
      appName,
    );
    const lockService = LockServiceFactory.create();

    let keyset: JoseKey[] | undefined;
    if (useConfidential) {
      const key = await this.loadSigningKey();
      keyset = [key];
      // Set jwks explicitly rather than letting NodeOAuthClient inject it
      // from the keyset: key.publicJwk carries `d` as an own property with
      // value undefined (`{...jwk, d: undefined}` upstream), and the
      // library's metadata schema rejects any jwks key where `'d' in key`.
      // The JSON round-trip drops undefined-valued properties.
      clientMetadata.jwks = JSON.parse(
        JSON.stringify({ keys: [key.publicJwk] }),
      );
    }

    const client = new NodeOAuthClient({
      clientMetadata,
      stateStore,
      sessionStore,
      requestLock: lockService.createRequestLock(),
      keyset,
    });

    this.registerSessionEventLogging(client);
    return client;
  }

  /**
   * Session deletion is the terminal failure we debug most (the library
   * deletes a session when a token refresh is rejected). Log the deletion
   * with its full cause chain and which process it happened in, so genuine
   * refresh-token expiry can be told apart from cross-process refresh races.
   *
   * The library re-dispatches 'deleted' on EVERY restore() of a DID whose
   * session row is already gone ("The session was deleted by another
   * process"), so an active client with a dead session produces one event
   * per request. Rate-limit per DID to keep the first, informative log and
   * drop the echo storm.
   */
  private static registerSessionEventLogging(client: NodeOAuthClient): void {
    const processGroup = process.env.FLY_PROCESS_GROUP || 'unknown';

    client.addEventListener('deleted', (event) => {
      const { sub, cause } = event.detail;
      if (!shouldLogDeletion(sub)) return;
      console.error(
        `[OAuthClient] Session DELETED for ${sub} (process: ${processGroup}). Cause chain: ${formatCauseChain(cause)} (further deletions for this DID suppressed for ${DELETION_LOG_INTERVAL_MS / 60_000} min)`,
      );
    });

    client.addEventListener('updated', (event) => {
      console.log(
        `[OAuthClient] Session updated (token refreshed) for ${event.detail.sub} (process: ${processGroup})`,
      );
    });
  }
}

const DELETION_LOG_INTERVAL_MS = 10 * 60 * 1000;
const DELETION_LOG_MAX_ENTRIES = 1000;
const lastDeletionLogAt = new Map<string, number>();

function shouldLogDeletion(sub: string): boolean {
  const now = Date.now();
  const last = lastDeletionLogAt.get(sub);
  if (last !== undefined && now - last < DELETION_LOG_INTERVAL_MS) {
    return false;
  }
  if (lastDeletionLogAt.size >= DELETION_LOG_MAX_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order).
    const oldest = lastDeletionLogAt.keys().next().value;
    if (oldest !== undefined) lastDeletionLogAt.delete(oldest);
  }
  // Delete before set so re-inserting refreshes insertion order.
  lastDeletionLogAt.delete(sub);
  lastDeletionLogAt.set(sub, now);
  return true;
}

function formatCauseChain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current && depth < 5) {
    if (current instanceof Error) {
      parts.push(`${current.name}: ${current.message}`);
      current = current.cause;
    } else {
      parts.push(JSON.stringify(current));
      break;
    }
    depth++;
  }
  return parts.join(' <- ') || String(error);
}
