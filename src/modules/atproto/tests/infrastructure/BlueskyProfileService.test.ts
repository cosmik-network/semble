import { Agent } from '@atproto/api';
import { ok, err } from 'src/shared/core/Result';
import { BlueskyProfileService } from '../../infrastructure/services/BlueskyProfileService';
import { IAgentService } from '../../application/IAgentService';

function makeAgent(): Agent {
  return {
    getProfile: async ({ actor }: { actor: string }) => ({
      success: true,
      data: {
        did: actor,
        handle: 'alice.bsky.social',
        displayName: 'Alice',
        description: 'bio',
        avatar: 'https://example.com/a.jpg',
        banner: 'https://example.com/b.jpg',
      },
    }),
  } as unknown as Agent;
}

function makeBatchAgent(callLog: string[][]): Agent {
  return {
    getProfiles: async ({ actors }: { actors: string[] }) => {
      callLog.push([...actors]);
      return {
        success: true,
        data: {
          profiles: actors
            .filter((a) => !a.includes('missing'))
            .map((a) => ({
              did: a,
              handle: `${a.slice(-4)}.bsky.social`,
              displayName: `User ${a.slice(-4)}`,
              avatar: 'https://example.com/a.jpg',
              banner: 'https://example.com/b.jpg',
              description: 'bio',
            })),
        },
      };
    },
  } as unknown as Agent;
}

describe('BlueskyProfileService', () => {
  it('never touches the caller session — profile reads are unauthenticated', async () => {
    const agentService = {
      getAuthenticatedAgent: jest.fn(),
      getUnauthenticatedAgent: jest.fn().mockReturnValue(ok(makeAgent())),
    } as unknown as IAgentService;

    const service = new BlueskyProfileService(agentService);
    const result = await service.getProfile(
      'did:plc:someuser',
      'did:plc:somecaller',
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('alice.bsky.social');
      expect(result.value.name).toBe('Alice');
    }
    expect(agentService.getAuthenticatedAgent).not.toHaveBeenCalled();
    expect(agentService.getUnauthenticatedAgent).toHaveBeenCalledTimes(1);
  });

  it('errors when the unauthenticated agent is unavailable', async () => {
    const agentService = {
      getAuthenticatedAgent: jest.fn(),
      getUnauthenticatedAgent: jest
        .fn()
        .mockReturnValue(err(new Error('no agent'))),
    } as unknown as IAgentService;

    const service = new BlueskyProfileService(agentService);
    const result = await service.getProfile('did:plc:someuser');

    expect(result.isErr()).toBe(true);
    expect(agentService.getAuthenticatedAgent).not.toHaveBeenCalled();
  });
});

describe('BlueskyProfileService.getProfiles', () => {
  it('fetches all profiles in one appview call and maps fields', async () => {
    const callLog: string[][] = [];
    const agentService = {
      getUnauthenticatedAgent: jest
        .fn()
        .mockReturnValue(ok(makeBatchAgent(callLog))),
    } as unknown as IAgentService;
    const service = new BlueskyProfileService(agentService);

    const result = await service.getProfiles(['did:plc:aaaa', 'did:plc:bbbb']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.size).toBe(2);
      const a = result.value.get('did:plc:aaaa')!;
      expect(a.name).toBe('User aaaa');
      expect(a.handle).toBe('aaaa.bsky.social');
      expect(a.bio).toBe('bio');
    }
    expect(callLog).toHaveLength(1);
  });

  it('chunks requests above 25 actors', async () => {
    const callLog: string[][] = [];
    const agentService = {
      getUnauthenticatedAgent: jest
        .fn()
        .mockReturnValue(ok(makeBatchAgent(callLog))),
    } as unknown as IAgentService;
    const service = new BlueskyProfileService(agentService);

    const ids = Array.from(
      { length: 30 },
      (_, i) => `did:plc:u${String(i).padStart(3, '0')}`,
    );
    const result = await service.getProfiles(ids);

    expect(result.isOk()).toBe(true);
    expect(callLog).toHaveLength(2);
    expect(callLog[0]).toHaveLength(25);
    expect(callLog[1]).toHaveLength(5);
  });

  it('omits unresolvable ids from the map without erroring', async () => {
    const callLog: string[][] = [];
    const agentService = {
      getUnauthenticatedAgent: jest
        .fn()
        .mockReturnValue(ok(makeBatchAgent(callLog))),
    } as unknown as IAgentService;
    const service = new BlueskyProfileService(agentService);

    const result = await service.getProfiles([
      'did:plc:aaaa',
      'did:plc:missing1',
    ]);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.has('did:plc:aaaa')).toBe(true);
      expect(result.value.has('did:plc:missing1')).toBe(false);
    }
  });

  it('returns empty map for empty input without calling the agent', async () => {
    const agentService = {
      getUnauthenticatedAgent: jest.fn(),
    } as unknown as IAgentService;
    const service = new BlueskyProfileService(agentService);

    const result = await service.getProfiles([]);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.size).toBe(0);
    expect(agentService.getUnauthenticatedAgent).not.toHaveBeenCalled();
  });
});
