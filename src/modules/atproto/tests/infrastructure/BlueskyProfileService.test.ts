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
