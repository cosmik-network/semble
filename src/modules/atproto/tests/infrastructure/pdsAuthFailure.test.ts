import {
  OAuthResponseError,
  TokenRefreshError,
  TokenRevokedError,
} from '@atproto/oauth-client-node';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';
import {
  describePdsAuthFailure,
  errorClassName,
  isTerminalSessionError,
} from '../../infrastructure/services/pdsAuthFailure';

const sub = 'did:plc:pdsauthfailuretest';

function oauthResponseError(status: number, payload: object) {
  return new OAuthResponseError(
    new Response(null, { status }),
    payload as OAuthResponseError['payload'],
  );
}

describe('pdsAuthFailure', () => {
  it('names library errors by constructor, not error.name', () => {
    const error = new TokenRefreshError(sub, 'The session was revoked');

    expect(error.name).toBe('Error');
    expect(errorClassName(error)).toBe('TokenRefreshError');
  });

  it.each([
    ['TokenRefreshError', new TokenRefreshError(sub, 'revoked')],
    ['TokenRevokedError', new TokenRevokedError(sub)],
    ['AuthenticationError', new AuthenticationError('no session')],
  ])('treats %s as terminal', (_name, error) => {
    expect(isTerminalSessionError(error)).toBe(true);
  });

  it('treats AuthMethodUnsatisfiableError (unexported) as terminal', () => {
    class AuthMethodUnsatisfiableError extends Error {}

    expect(isTerminalSessionError(new AuthMethodUnsatisfiableError())).toBe(
      true,
    );
  });

  it.each([
    ['a network failure', new TypeError('fetch failed')],
    [
      'a non-invalid_grant token endpoint error',
      oauthResponseError(401, { error: 'invalid_client' }),
    ],
  ])('treats %s as transient', (_name, error) => {
    expect(isTerminalSessionError(error)).toBe(false);
  });

  it('extracts the OAuth response from deep in the cause chain', () => {
    const cause = oauthResponseError(400, {
      error: 'invalid_grant',
      error_description: 'Refresh token expired',
    });
    const error = new TokenRefreshError(sub, 'Refresh token expired', {
      cause,
    });

    expect(describePdsAuthFailure(error)).toMatchObject({
      errorName: 'TokenRefreshError',
      terminal: true,
      rootCauseName: 'OAuthResponseError',
      oauthError: 'invalid_grant',
      oauthErrorDescription: 'Refresh token expired',
      httpStatus: 400,
      causeChain:
        'TokenRefreshError: Refresh token expired <- OAuthResponseError: OAuth "invalid_grant" error: Refresh token expired',
    });
  });

  it('reports transient failures with their root cause and no OAuth fields', () => {
    const error = new Error('Failed to refresh', {
      cause: new TypeError('fetch failed'),
    });

    const details = describePdsAuthFailure(error);

    expect(details.terminal).toBe(false);
    expect(details.rootCauseName).toBe('TypeError');
    expect(details.httpStatus).toBeUndefined();
  });
});

describe('requiresReauth', () => {
  it.each([
    ['a terminal failure', new TokenRevokedError(sub), true],
    [
      'invalid_client',
      oauthResponseError(401, { error: 'invalid_client' }),
      true,
    ],
    [
      'an auth server 5xx',
      oauthResponseError(503, { error: 'server_error' }),
      false,
    ],
    ['a network failure', new TypeError('fetch failed'), false],
  ])('%s -> %s', (_name, error, expected) => {
    expect(describePdsAuthFailure(error).requiresReauth).toBe(expected);
  });
});
