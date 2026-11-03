import {
  NodeOAuthClient,
  OAuthResponseError,
  TokenRefreshError,
} from '@atproto/oauth-client-node';
import { ATProtoAgentService } from '../../infrastructure/services/ATProtoAgentService';
import { IAppPasswordSessionService } from '../../application/IAppPasswordSessionService';
import { DID } from '../../domain/DID';
import { err } from 'src/shared/core/Result';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import {
  AuthenticationError,
  PdsUnavailableError,
} from 'src/shared/core/AuthenticationError';

type Listener = (event: { detail: { sub: string } }) => void;

function makeOAuthClientStub(restore: jest.Mock) {
  const listeners = new Map<string, Listener[]>();
  return {
    stub: {
      restore,
      addEventListener: (type: string, listener: Listener) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
    } as unknown as NodeOAuthClient,
    emit(type: string, sub: string) {
      for (const l of listeners.get(type) ?? []) l({ detail: { sub } });
    },
  };
}

const appPasswordServiceStub = {
  getSession: jest
    .fn()
    .mockResolvedValue(err(new Error('no app password session'))),
  createSession: jest.fn().mockResolvedValue(err(new Error('not implemented'))),
} as unknown as IAppPasswordSessionService;

const configServiceStub = {
  getAtProtoServiceAccount: () => ({ identifier: '', appPassword: '' }),
} as unknown as EnvironmentConfigService;

// The real library class: its instances have name "Error", so this guards
// against classifying by error.name.
function terminalError(): Error {
  return new TokenRefreshError(
    'did:plc:negcachetestuser',
    'The session was deleted by another process',
  );
}

describe('ATProtoAgentService OAuth negative cache', () => {
  beforeEach(() => {
    // Every failed restore is reported; keep the expected noise out.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const did = (() => {
    const result = DID.create('did:plc:negcachetestuser');
    if (result.isErr()) throw new Error('invalid test DID');
    return result.value;
  })();

  it('does not call restore again within the TTL after a terminal failure', async () => {
    const restore = jest.fn().mockRejectedValue(terminalError());
    const { stub } = makeOAuthClientStub(restore);
    const service = new ATProtoAgentService(
      stub,
      appPasswordServiceStub,
      configServiceStub,
    );

    const first = await service.getAuthenticatedAgentByOAuthSession(did);
    const second = await service.getAuthenticatedAgentByOAuthSession(did);

    expect(first.isErr()).toBe(true);
    expect(second.isErr()).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('clears the negative cache when the session store emits "updated"', async () => {
    const restore = jest.fn().mockRejectedValue(terminalError());
    const { stub, emit } = makeOAuthClientStub(restore);
    const service = new ATProtoAgentService(
      stub,
      appPasswordServiceStub,
      configServiceStub,
    );

    await service.getAuthenticatedAgentByOAuthSession(did);
    emit('updated', did.value);
    await service.getAuthenticatedAgentByOAuthSession(did);

    expect(restore).toHaveBeenCalledTimes(2);
  });

  it('negative-caches a missing session (restore resolves undefined)', async () => {
    const restore = jest.fn().mockResolvedValue(undefined);
    const { stub } = makeOAuthClientStub(restore);
    const service = new ATProtoAgentService(
      stub,
      appPasswordServiceStub,
      configServiceStub,
    );

    await service.getAuthenticatedAgentByOAuthSession(did);
    await service.getAuthenticatedAgentByOAuthSession(did);

    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('does not negative-cache transient (non-terminal) errors', async () => {
    const restore = jest.fn().mockRejectedValue(new Error('fetch failed'));
    const { stub } = makeOAuthClientStub(restore);
    const service = new ATProtoAgentService(
      stub,
      appPasswordServiceStub,
      configServiceStub,
    );

    await service.getAuthenticatedAgentByOAuthSession(did);
    await service.getAuthenticatedAgentByOAuthSession(did);

    expect(restore).toHaveBeenCalledTimes(2);
  });
});

describe('ATProtoAgentService OAuth failure classification', () => {
  const did = (() => {
    const result = DID.create('did:plc:classificationtestuser');
    if (result.isErr()) throw new Error('invalid test DID');
    return result.value;
  })();

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function serviceWithRestoreError(error: unknown) {
    const { stub } = makeOAuthClientStub(jest.fn().mockRejectedValue(error));
    return new ATProtoAgentService(
      stub,
      appPasswordServiceStub,
      configServiceStub,
    );
  }

  it('returns a retryable PdsUnavailableError for transient failures, even after the app password fallback fails', async () => {
    const service = serviceWithRestoreError(new TypeError('fetch failed'));

    const result = await service.getAuthenticatedAgent(did);

    expect(result.isErr() && result.error).toBeInstanceOf(PdsUnavailableError);
  });

  it('returns a plain AuthenticationError (re-auth) for terminal failures', async () => {
    const service = serviceWithRestoreError(terminalError());

    const result = await service.getAuthenticatedAgent(did);

    expect(result.isErr() && result.error).toBeInstanceOf(AuthenticationError);
    expect(result.isErr() && result.error).not.toBeInstanceOf(
      PdsUnavailableError,
    );
  });

  it('requires re-auth for persistent token endpoint rejections the library keeps the session for', async () => {
    const service = serviceWithRestoreError(
      new OAuthResponseError(new Response(null, { status: 401 }), {
        error: 'invalid_client',
      }),
    );

    const result = await service.getAuthenticatedAgentByOAuthSession(did);

    expect(result.isErr() && result.error).not.toBeInstanceOf(
      PdsUnavailableError,
    );
  });
});
