import { Result } from 'src/shared/core/Result';
import { OAuthCallbackDTO } from '@semble/types';

export interface AuthResult {
  did: string;
  handle?: string;
  // App-relative path carried through the OAuth flow's app state, if the
  // sign-in was initiated with one (e.g. re-auth after a session expiry).
  redirectPath?: string;
}

export interface GenerateAuthUrlOptions {
  redirectPath?: string;
}

export interface IOAuthProcessor {
  generateAuthUrl(
    handle?: string,
    options?: GenerateAuthUrlOptions,
  ): Promise<Result<string>>;
  processCallback(params: OAuthCallbackDTO): Promise<Result<AuthResult>>;
}
