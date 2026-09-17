import { Result, ok, err } from 'src/shared/core/Result';
import { IIdentityResolutionService } from '../../domain/services/IIdentityResolutionService';
import { DID } from '../../domain/DID';
import { DIDOrHandle } from '../../domain/DIDOrHandle';
import { Handle } from '../../domain/Handle';
import { IAgentService } from '../../application/IAgentService';
import { IdResolver } from '@atproto/identity';

// Cap on DNS/.well-known and PLC lookups made through the IdResolver.
const ID_RESOLVER_TIMEOUT_MS = 3_000;

// How long to wait for the primary resolution before also firing the
// fallback. Only slow primary responses pay for the second lookup.
const HEDGE_DELAY_MS = 300;

// Used when the host's local DNS resolver fails to answer the TXT query.
const BACKUP_NAMESERVERS = ['1.1.1.1', '8.8.8.8'];

export class ATProtoIdentityResolutionService implements IIdentityResolutionService {
  private readonly idResolver: IdResolver;

  constructor(private readonly agentService: IAgentService) {
    this.idResolver = new IdResolver({
      timeout: ID_RESOLVER_TIMEOUT_MS,
      backupNameservers: BACKUP_NAMESERVERS,
    });
  }

  async resolveToDID(identifier: DIDOrHandle): Promise<Result<DID>> {
    try {
      // If it's already a DID, return it directly
      if (identifier.isDID) {
        const did = identifier.getDID();
        if (!did) {
          return err(new Error('Invalid DID in identifier'));
        }
        return ok(did);
      }

      // If it's a handle, resolve it to a DID
      const handle = identifier.getHandle();
      if (!handle) {
        return err(new Error('Invalid handle in identifier'));
      }

      const didValue = await this.resolveHandleHedged(handle.value);

      const didResult = DID.create(didValue);
      if (didResult.isErr()) {
        return err(
          new Error(
            `Invalid DID returned from handle resolution: ${didResult.error.message}`,
          ),
        );
      }

      return ok(didResult.value);
    } catch (error) {
      return err(
        new Error(
          `Error resolving identifier to DID: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  /**
   * Resolve a handle to a DID with a hedged request. The protocol-native
   * DNS TXT / .well-known resolution (verified against the DID document)
   * is primary — it is fast, cached by local resolvers, and independent of
   * Bluesky infrastructure. The appview only fires if the primary hasn't
   * answered within HEDGE_DELAY_MS or fails outright. First success wins.
   */
  private async resolveHandleHedged(handle: string): Promise<string> {
    try {
      return await this.hedge(
        () => this.resolveHandleViaDnsVerified(handle),
        () => this.resolveHandleViaAppView(handle),
      );
    } catch (error) {
      const messages =
        error instanceof AggregateError
          ? error.errors
              .map((e) => (e instanceof Error ? e.message : String(e)))
              .join('; ')
          : error instanceof Error
            ? error.message
            : String(error);
      throw new Error(`Failed to resolve handle ${handle}: ${messages}`);
    }
  }

  /**
   * Run `primary`, starting `secondary` only if the primary is slow
   * (HEDGE_DELAY_MS) or fails. Resolves with the first success; rejects
   * with an AggregateError if both fail.
   */
  private hedge<T>(
    primary: () => Promise<T>,
    secondary: () => Promise<T>,
  ): Promise<T> {
    const primaryAttempt = primary();

    const secondaryAttempt = new Promise<T>((resolve, reject) => {
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        secondary().then(resolve, reject);
      };
      const timer = setTimeout(start, HEDGE_DELAY_MS);
      primaryAttempt.then(
        () => clearTimeout(timer), // primary won: never fire the fallback
        () => {
          clearTimeout(timer);
          start(); // primary failed fast: fire the fallback immediately
        },
      );
    });

    return Promise.any([primaryAttempt, secondaryAttempt]);
  }

  /**
   * DNS TXT / .well-known resolution, verified bidirectionally: the DID's
   * document must list the handle in alsoKnownAs, otherwise anyone could
   * alias an arbitrary handle to someone else's DID.
   */
  private async resolveHandleViaDnsVerified(handle: string): Promise<string> {
    const did = await this.idResolver.handle.resolve(handle);
    if (!did) {
      throw new Error(`DNS/.well-known resolution found no DID for ${handle}`);
    }

    const didDoc = await this.idResolver.did.resolve(did);
    if (!didDoc?.alsoKnownAs?.includes(`at://${handle}`)) {
      throw new Error(
        `DID document for ${did} does not confirm handle ${handle}`,
      );
    }

    return did;
  }

  private async resolveHandleViaAppView(handle: string): Promise<string> {
    const agentResult = this.agentService.getUnauthenticatedAgent();
    if (agentResult.isErr()) {
      throw new Error(
        `Failed to get agent for handle resolution: ${agentResult.error.message}`,
      );
    }

    const profileResult = await agentResult.value.resolveHandle({ handle });

    if (!profileResult.success) {
      throw new Error(
        `Appview failed to resolve handle ${handle}: ${JSON.stringify(profileResult)}`,
      );
    }

    return profileResult.data.did;
  }

  async resolveToHandle(identifier: DIDOrHandle): Promise<Result<Handle>> {
    try {
      // If it's already a handle, return it directly
      if (identifier.isHandle) {
        const handle = identifier.getHandle();
        if (!handle) {
          return err(new Error('Invalid handle in identifier'));
        }
        return ok(handle);
      }

      // If it's a DID, resolve its DID document (PLC directory or
      // did:web .well-known) and read the handle from alsoKnownAs.
      const did = identifier.getDID();
      if (!did) {
        return err(new Error('Invalid DID in identifier'));
      }

      const didDoc = await this.idResolver.did.resolve(did.value);
      if (!didDoc) {
        return err(
          new Error(`Failed to resolve DID document for ${did.value}`),
        );
      }

      // The handle is the alsoKnownAs entry with the at:// scheme
      const handleValue = didDoc.alsoKnownAs
        ?.find((aka) => aka.startsWith('at://'))
        ?.slice('at://'.length);
      if (!handleValue) {
        return err(
          new Error(`No handle found in DID document for ${did.value}`),
        );
      }

      const handleResult = Handle.create(handleValue);
      if (handleResult.isErr()) {
        return err(
          new Error(
            `Invalid handle returned from DID resolution: ${handleResult.error.message}`,
          ),
        );
      }

      return ok(handleResult.value);
    } catch (error) {
      return err(
        new Error(
          `Error resolving identifier to handle: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  async resolveAtprotoKey(did: string): Promise<Result<string>> {
    try {
      // Use IdResolver to get the atproto signing key
      const atprotoKey = await this.idResolver.did.resolveAtprotoKey(did);
      return ok(atprotoKey);
    } catch (error) {
      return err(
        new Error(
          `Error resolving atproto key for DID ${did}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
