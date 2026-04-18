import { Result, ok, err } from 'src/shared/core/Result';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { DID } from 'src/modules/atproto/domain/DID';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { Handle } from 'src/modules/atproto/domain/Handle';

export class FakeIdentityResolutionService
  implements IIdentityResolutionService
{
  private handleToDIDMap: Map<string, string> = new Map();
  private didToHandleMap: Map<string, string> = new Map();
  private didToKeyMap: Map<string, string> = new Map();
  private shouldFail = false;

  async resolveToDID(identifier: DIDOrHandle): Promise<Result<DID>> {
    if (this.shouldFail) {
      return err(new Error('Identity resolution service failed'));
    }

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

      // Check if we have a mapping for this handle
      const mappedDID = this.handleToDIDMap.get(handle.value);
      if (!mappedDID) {
        return err(new Error(`Handle not found: ${handle.value}`));
      }

      // Create and return the DID
      const didResult = DID.create(mappedDID);
      if (didResult.isErr()) {
        return err(
          new Error(`Invalid DID in mapping: ${didResult.error.message}`),
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
    if (this.shouldFail) {
      return err(new Error('Identity resolution service failed'));
    }

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

      // Check if we have a mapping for this DID
      const mappedHandle = this.didToHandleMap.get(did.value);
      if (!mappedHandle) {
        return err(new Error(`DID not found: ${did.value}`));
      }

      // Create and return the Handle
      const handleResult = Handle.create(mappedHandle);
      if (handleResult.isErr()) {
        return err(
          new Error(`Invalid handle in mapping: ${handleResult.error.message}`),
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
    if (this.shouldFail) {
      return err(new Error('Identity resolution service failed'));
    }

    try {
      // Check if we have a mapping for this DID
      const mappedKey = this.didToKeyMap.get(did);
      if (mappedKey) {
        return ok(mappedKey);
      }

      // Return a default fake key if no mapping exists
      // Format: did:key:z... (multibase format)
      return ok(`did:key:zFakeKey${did.slice(-10)}`);
    } catch (error) {
      return err(
        new Error(
          `Error resolving atproto key for DID ${did}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  // Test helper methods
  addHandleMapping(handle: string, did: string): void {
    this.handleToDIDMap.set(handle, did);
    this.didToHandleMap.set(did, handle);
  }

  addKeyMapping(did: string, key: string): void {
    this.didToKeyMap.set(did, key);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.handleToDIDMap.clear();
    this.didToHandleMap.clear();
    this.didToKeyMap.clear();
    this.shouldFail = false;
  }
}
