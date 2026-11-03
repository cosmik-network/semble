import * as Sentry from '@sentry/node';
import {
  OAuthResponseError,
  TokenInvalidError,
  TokenRefreshError,
  TokenRevokedError,
} from '@atproto/oauth-client-node';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';

/**
 * Where in the PDS auth lifecycle a failure was observed:
 * - oauth_restore: restoring an agent for a PDS write/read failed. Events
 *   with requires_reauth=true surfaced as a 401 (the user was logged out);
 *   the rest as a 503 the user can retry.
 * - session_deleted: the OAuth library deleted a stored session (refresh
 *   rejected, revoked, auth method unsatisfiable). Fires in any process,
 *   including workers.
 */
export type PdsAuthFailureStage = 'oauth_restore' | 'session_deleted';

const MAX_CAUSE_DEPTH = 5;

/**
 * The @atproto/oauth-client error classes never set `name`, so `error.name`
 * is always "Error". The constructor name is the only reliable label (the
 * backend bundle is not minified and node_modules stay external).
 */
export function errorClassName(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const ctorName = error.constructor?.name;
  return ctorName && ctorName !== 'Error' ? ctorName : error.name;
}

/**
 * Session-terminal failures: the stored session is gone (or the library just
 * deleted it) and stays dead until the user re-authenticates. Everything else
 * — network errors, PDS 5xx, non-invalid_grant token endpoint errors, lock or
 * metadata fetch failures — leaves the session in place.
 *
 * Mirrors the library's own deleteOnError predicate. AuthMethodUnsatisfiable
 * is not exported by the package, hence the name check.
 */
export function isTerminalSessionError(error: unknown): boolean {
  return (
    error instanceof AuthenticationError || // our "no session found"
    error instanceof TokenRefreshError ||
    error instanceof TokenRevokedError ||
    error instanceof TokenInvalidError ||
    errorClassName(error) === 'AuthMethodUnsatisfiableError'
  );
}

/**
 * Token endpoint rejections the library does not delete the session for, but
 * which repeat on every refresh until the user logs in again (e.g. a session
 * pinned to a client auth method the server no longer accepts). Treating these
 * as retryable would leave the user signed in with every PDS write failing.
 */
const REAUTH_OAUTH_ERRORS = new Set(['invalid_client', 'unauthorized_client']);

function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  while (current !== undefined && chain.length < MAX_CAUSE_DEPTH) {
    chain.push(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return chain;
}

export function formatCauseChain(error: unknown): string {
  const parts = causeChain(error).map((e) =>
    e instanceof Error
      ? `${errorClassName(e)}: ${e.message}`
      : JSON.stringify(e),
  );
  return parts.join(' <- ') || String(error);
}

export interface PdsAuthFailureDetails {
  errorName: string;
  message: string;
  terminal: boolean;
  /**
   * Whether only a fresh OAuth sign-in can fix this: terminal failures plus
   * persistent token endpoint rejections. Everything else is retryable.
   */
  requiresReauth: boolean;
  /** Class name of the deepest error in the cause chain. */
  rootCauseName: string;
  causeChain: string;
  /** Set when an authorization/resource server response is in the chain. */
  oauthError?: string;
  oauthErrorDescription?: string;
  httpStatus?: number;
  endpoint?: string;
}

export function describePdsAuthFailure(error: unknown): PdsAuthFailureDetails {
  const chain = causeChain(error);
  const oauthResponse = chain.find(
    (e): e is OAuthResponseError => e instanceof OAuthResponseError,
  );
  const root = chain[chain.length - 1];
  const terminal = isTerminalSessionError(error);

  return {
    errorName: errorClassName(error),
    message: error instanceof Error ? error.message : String(error),
    terminal,
    requiresReauth:
      terminal ||
      (oauthResponse?.error !== undefined &&
        REAUTH_OAUTH_ERRORS.has(oauthResponse.error)),
    rootCauseName: errorClassName(root),
    causeChain: formatCauseChain(error),
    ...(oauthResponse
      ? {
          oauthError: oauthResponse.error,
          oauthErrorDescription: oauthResponse.errorDescription,
          httpStatus: oauthResponse.status,
          endpoint: oauthResponse.response.url || undefined,
        }
      : {}),
  };
}

/**
 * Logs a PDS auth failure with its full cause chain and reports it to Sentry,
 * grouped by stage + failure reason so each distinct cause becomes its own
 * issue whose event count is the occurrence rate. `pds_auth.requires_reauth`
 * separates failures that logged the user out from retryable ones.
 */
export function reportPdsAuthFailure(
  stage: PdsAuthFailureStage,
  did: string,
  error: unknown,
): PdsAuthFailureDetails {
  const details = describePdsAuthFailure(error);
  const processGroup =
    process.env.FLY_PROCESS_GROUP || process.env.PROCESS_TYPE || 'unknown';

  const oauthSummary =
    details.httpStatus !== undefined
      ? ` [oauth: ${details.httpStatus} ${details.oauthError ?? 'unknown'}${details.oauthErrorDescription ? ` - ${details.oauthErrorDescription}` : ''}${details.endpoint ? ` @ ${details.endpoint}` : ''}]`
      : '';
  console.error(
    `[PdsAuth] ${stage} failed for ${did} (process: ${processGroup}, terminal: ${details.terminal}, requires_reauth: ${details.requiresReauth}). Cause chain: ${details.causeChain}${oauthSummary}`,
  );

  const reason = details.oauthError ?? details.rootCauseName;
  Sentry.withScope((scope) => {
    scope.setLevel(details.requiresReauth ? 'warning' : 'error');
    scope.setUser({ id: did });
    scope.setTags({
      'pds_auth.stage': stage,
      'pds_auth.terminal': String(details.terminal),
      'pds_auth.requires_reauth': String(details.requiresReauth),
      'pds_auth.error': details.errorName,
      'pds_auth.reason': reason,
      'pds_auth.process': processGroup,
      ...(details.httpStatus !== undefined
        ? { 'pds_auth.http_status': String(details.httpStatus) }
        : {}),
    });
    scope.setContext('pds_auth', { ...details });
    scope.setFingerprint([
      'pds-auth-failure',
      stage,
      details.errorName,
      reason,
    ]);
    Sentry.captureException(error);
  });

  return details;
}
