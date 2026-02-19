import { AtpAgent } from '@atproto/api';
import { DidResolver } from '@atproto/identity';

export interface DIDDocument {
  id: string;
  alsoKnownAs?: string[];
  verificationMethod?: any[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

const didResolver = new DidResolver({});

/**
 * Resolve a DID to find the user's PDS URL
 */
export async function resolveDIDToPDS(did: string): Promise<string> {
  try {
    // Use the official @atproto/identity resolver
    const didDoc = await didResolver.resolve(did);

    if (!didDoc) {
      throw new Error(`Could not resolve DID: ${did}`);
    }

    // Extract PDS service endpoint
    const pdsService = didDoc.service?.find((s) => s.id === '#atproto_pds');

    if (!pdsService?.serviceEndpoint) {
      throw new Error(`No PDS found for DID: ${did}`);
    }

    // Handle both string and object formats
    const pdsUrl =
      typeof pdsService.serviceEndpoint === 'string'
        ? pdsService.serviceEndpoint
        : pdsService.serviceEndpoint.uri ||
          (pdsService.serviceEndpoint as any).url;

    if (!pdsUrl) {
      throw new Error(`Invalid PDS endpoint format for DID: ${did}`);
    }

    return pdsUrl;
  } catch (error) {
    console.error('Error resolving DID:', error);
    throw error;
  }
}

/**
 * Create an AtpAgent for a specific user's PDS
 */
export async function createAgentForDID(did: string): Promise<AtpAgent> {
  const pdsUrl = await resolveDIDToPDS(did);
  return new AtpAgent({ service: pdsUrl });
}
