import { AtpAgent } from '@atproto/api';

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

/**
 * Resolve a DID to find the user's PDS URL
 */
export async function resolveDIDToPDS(did: string): Promise<string> {
  try {
    const plcResponse = await fetch(`https://plc.directory/${did}`);

    if (!plcResponse.ok) {
      throw new Error(`Failed to resolve DID: ${plcResponse.statusText}`);
    }

    const didDoc: DIDDocument = await plcResponse.json();

    const pdsUrl = didDoc.service?.find(
      (s) => s.id === '#atproto_pds',
    )?.serviceEndpoint;

    if (!pdsUrl) {
      throw new Error(`No PDS found for DID: ${did}`);
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
