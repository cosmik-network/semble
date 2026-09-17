import { AtpAgent, AtpSessionData } from '@atproto/api';
import { AppPasswordSessionService } from '../../infrastructure/services/AppPasswordSessionService';
import { InMemoryAppPasswordSessionRepository } from './InMemoryAppPasswordSessionRepository';

const did = 'did:plc:b64lsctzqnzpv6vd4ry3qktw';
const currentPds = 'https://current-pds.example';
const session: AtpSessionData = {
  did,
  handle: 'example.test',
  active: true,
  accessJwt: 'access-token',
  refreshJwt: 'refresh-token',
};
const didDoc = {
  id: did,
  service: [
    {
      id: '#atproto_pds',
      type: 'AtprotoPersonalDataServer',
      serviceEndpoint: currentPds,
    },
  ],
};

function fixture({ inactive = false, rejectStored = false } = {}) {
  const repository = InMemoryAppPasswordSessionRepository.getInstance();
  repository.clear();
  const requests: string[] = [];
  const identifiers: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
    );
    requests.push(url.href);
    if (url.origin !== currentPds)
      throw new Error('Credential request sent to wrong PDS');
    if (rejectStored && !url.pathname.endsWith('createSession')) {
      return new Response(
        JSON.stringify({
          error: 'InvalidToken',
          message: 'Token belongs to the old PDS',
        }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
    return new Response(
      JSON.stringify({ ...session, active: !inactive, didDoc }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  };
  const factory = async (identifier: string) => {
    identifiers.push(identifier);
    return {
      did,
      agent: new AtpAgent({ service: currentPds, fetch: fetcher }),
    };
  };
  return {
    repository,
    requests,
    identifiers,
    service: new AppPasswordSessionService(repository, factory),
  };
}

describe('app-password sessions follow the current PDS', () => {
  it('logs in through the resolved PDS and stores an active session', async () => {
    const f = fixture();
    const result = await f.service.createSession(
      'example.test',
      'test-password',
    );
    expect(result.isOk()).toBe(true);
    expect(f.identifiers).toEqual(['example.test']);
    expect(f.requests).toEqual([
      `${currentPds}/xrpc/com.atproto.server.createSession`,
    ]);
    expect(f.repository.size()).toBe(1);
  });
  it('does not mistake a successful inactive-account login for usable authentication', async () => {
    const f = fixture({ inactive: true });
    expect(
      (await f.service.createSession('example.test', 'test-password')).isErr(),
    ).toBe(true);
    expect(f.repository.size()).toBe(0);
  });
  it('restores at the current PDS instead of the fixed Bluesky service', async () => {
    const f = fixture();
    await f.repository.saveSession(did, {
      session,
      appPassword: 'test-password',
    });
    expect((await f.service.getSession(did)).isOk()).toBe(true);
    expect(f.requests).toEqual([
      `${currentPds}/xrpc/com.atproto.server.getSession`,
    ]);
  });
  it('re-authenticates on the current PDS when persisted old-PDS tokens are rejected', async () => {
    const f = fixture({ rejectStored: true });
    await f.repository.saveSession(did, {
      session,
      appPassword: 'test-password',
    });
    expect((await f.service.getSession(did)).isOk()).toBe(true);
    expect(f.requests.at(-1)).toBe(
      `${currentPds}/xrpc/com.atproto.server.createSession`,
    );
    expect(f.requests.every((request) => request.startsWith(currentPds))).toBe(
      true,
    );
  });
  it('does not silently fall back to Bluesky when identity resolution fails', async () => {
    const f = fixture();
    const service = new AppPasswordSessionService(f.repository, async () => {
      throw new Error('DID resolution failed');
    });
    expect(
      (await service.createSession('example.test', 'test-password')).isErr(),
    ).toBe(true);
    expect(f.repository.size()).toBe(0);
    expect(f.requests).toEqual([]);
  });
});
