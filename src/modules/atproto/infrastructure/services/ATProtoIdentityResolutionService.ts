import { Result, ok, err } from 'src/shared/core/Result';
import { IIdentityResolutionService } from '../../domain/services/IIdentityResolutionService';
import { DID } from '../../domain/DID';
import { DIDOrHandle } from '../../domain/DIDOrHandle';
import { Handle } from '../../domain/Handle';
import { IAgentService } from '../../application/IAgentService';
import { IdResolver } from '@atproto/identity';

export class ATProtoIdentityResolutionService
  implements IIdentityResolutionService
{
  private readonly idResolver: IdResolver;

  constructor(private readonly agentService: IAgentService) {
    this.idResolver = new IdResolver();
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

      // Get an unauthenticated agent to resolve the handle
      const agentResult = this.agentService.getUnauthenticatedAgent();
      if (agentResult.isErr()) {
        return err(
          new Error(
            `Failed to get agent for handle resolution: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      // Resolve the handle to get the DID
      const profileResult = await agent.resolveHandle({ handle: handle.value });

      if (!profileResult.success) {
        return err(
          new Error(
            `Failed to resolve handle ${handle.value}: ${JSON.stringify(profileResult)}`,
          ),
        );
      }

      // Create and return the DID
      const didResult = DID.create(profileResult.data.did);
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

      // If it's a DID, resolve it to a handle
      const did = identifier.getDID();
      if (!did) {
        return err(new Error('Invalid DID in identifier'));
      }

      // Get an unauthenticated agent to resolve the DID
      const agentResult = this.agentService.getUnauthenticatedAgent();
      if (agentResult.isErr()) {
        return err(
          new Error(
            `Failed to get agent for DID resolution: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      // Get the profile to extract the handle
      const profileResult = await agent.getProfile({ actor: did.value });

      if (!profileResult.success) {
        return err(
          new Error(
            `Failed to resolve DID ${did.value}: ${JSON.stringify(profileResult)}`,
          ),
        );
      }

      // Create and return the Handle
      const handleResult = Handle.create(profileResult.data.handle);
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
