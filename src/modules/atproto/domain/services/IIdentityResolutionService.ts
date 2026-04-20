import { Result } from 'src/shared/core/Result';
import { DID } from '../DID';
import { DIDOrHandle } from '../DIDOrHandle';
import { Handle } from '../Handle';

export interface IIdentityResolutionService {
  resolveToDID(identifier: DIDOrHandle): Promise<Result<DID>>;
  resolveToHandle(identifier: DIDOrHandle): Promise<Result<Handle>>;
  /**
   * Resolve a DID to its atproto signing key (multibase format).
   * Used for JWT verification in XRPC endpoints.
   */
  resolveAtprotoKey(did: string): Promise<Result<string>>;
}
