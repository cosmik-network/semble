import { AtpAgent } from '@atproto/api';
import { IdResolver } from '@atproto/identity';

export async function createPdsAgent(identifier: string) {
  const resolver = new IdResolver();
  const did = identifier.startsWith('did:')
    ? identifier
    : await resolver.handle.resolve(identifier);
  if (!did) throw new Error('Could not resolve account handle');
  const identity = await resolver.did.resolveAtprotoData(did);
  const endpoint = new URL(identity.pds);
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error(
      'Account PDS must be an HTTPS endpoint without credentials',
    );
  }
  return { did, agent: new AtpAgent({ service: endpoint }) };
}
