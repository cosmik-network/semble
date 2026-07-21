import { Result } from 'src/shared/core/Result';
import { OAuthCallbackDTO } from '@semble/types';

export interface AuthResult {
  did: string;
  handle?: string;
  // Round-tripped opaque app state passed to generateAuthUrl (e.g. 'native').
  appState?: string;
}

export interface IOAuthProcessor {
  generateAuthUrl(handle?: string, appState?: string): Promise<Result<string>>;
  processCallback(params: OAuthCallbackDTO): Promise<Result<AuthResult>>;
}
