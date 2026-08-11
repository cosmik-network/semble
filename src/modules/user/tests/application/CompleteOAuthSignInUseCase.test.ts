import { ok, err, Result } from 'src/shared/core/Result';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { TokenPair } from '@semble/types';
import { CompleteOAuthSignInUseCase } from '../../application/use-cases/CompleteOAuthSignInUseCase';
import { IOAuthProcessor } from '../../application/services/IOAuthProcessor';
import { ITokenService } from '../../application/services/ITokenService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import {
  AuthenticationResult,
  IUserAuthenticationService,
} from '../../domain/services/IUserAuthenticationService';
import {
  IUserOnboardingRepository,
  OnboardingStateRecord,
  OnboardingStatus,
} from '../../domain/repositories/IUserOnboardingRepository';
import { User } from '../../domain/User';
import { DID } from '../../domain/value-objects/DID';
import { InMemoryUserOnboardingRepository } from '../infrastructure/InMemoryUserOnboardingRepository';

const DID_VALUE = 'did:plc:testuser';
const CUTOFF = new Date('2026-08-01T00:00:00Z');
const BEFORE_CUTOFF = new Date('2026-07-31T23:59:59Z');
const AFTER_CUTOFF = new Date('2026-08-02T00:00:00Z');

const TOKENS: TokenPair = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const VALID_CALLBACK = {
  code: 'code',
  state: 'state',
  iss: 'https://bsky.social',
};

function makeUser(linkedAt: Date): User {
  const did = DID.create(DID_VALUE);
  if (did.isErr()) {
    throw did.error;
  }

  const user = User.create(
    { did: did.value, linkedAt, lastLoginAt: linkedAt },
    new UniqueEntityID(DID_VALUE),
  );
  if (user.isErr()) {
    throw user.error;
  }

  return user.value;
}

describe('CompleteOAuthSignInUseCase', () => {
  let onboardingRepository: InMemoryUserOnboardingRepository;
  let oauthProcessor: IOAuthProcessor;
  let tokenService: ITokenService;
  let userRepository: IUserRepository;
  let userAuthService: IUserAuthenticationService;

  beforeEach(() => {
    onboardingRepository = InMemoryUserOnboardingRepository.getInstance();

    oauthProcessor = {
      generateAuthUrl: async () => ok('https://example.com/authorize'),
      processCallback: async () => ok({ did: DID_VALUE }),
    };

    tokenService = {
      generateToken: async () => ok(TOKENS),
      validateToken: async () => ok(DID_VALUE),
      refreshToken: async () => ok(TOKENS),
      revokeToken: async () => ok(undefined),
    };

    userRepository = {
      findByDID: async () => ok(null),
      save: async () => ok(undefined),
      findExistingDIDs: async () => ok([]),
    };
  });

  afterEach(() => {
    onboardingRepository.clear();
  });

  function buildUseCase(options: {
    linkedAt: Date;
    onboardingRedirectAfter?: Date;
    onboardingRepositoryOverride?: IUserOnboardingRepository;
  }): CompleteOAuthSignInUseCase {
    const user = makeUser(options.linkedAt);

    userAuthService = {
      validateUserCredentials: async (): Promise<
        Result<AuthenticationResult>
      > => ok({ user, isNewUser: true }),
    };

    return new CompleteOAuthSignInUseCase(
      oauthProcessor,
      tokenService,
      userRepository,
      userAuthService,
      options.onboardingRepositoryOverride ?? onboardingRepository,
      { onboardingRedirectAfter: options.onboardingRedirectAfter },
    );
  }

  async function redirectPathFor(options: {
    linkedAt: Date;
    onboardingRedirectAfter?: Date;
    onboardingState?: OnboardingStatus;
    onboardingRepositoryOverride?: IUserOnboardingRepository;
  }): Promise<string> {
    if (options.onboardingState) {
      await onboardingRepository.upsert(DID_VALUE, {
        onboardingState: options.onboardingState,
      });
    }

    const useCase = buildUseCase(options);
    const result = await useCase.execute(VALID_CALLBACK);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.accessToken).toBe(TOKENS.accessToken);
    expect(result.value.refreshToken).toBe(TOKENS.refreshToken);

    return result.value.redirectPath;
  }

  it('redirects to /home when no cutoff is configured, even for a brand-new user', async () => {
    const path = await redirectPathFor({ linkedAt: AFTER_CUTOFF });
    expect(path).toBe('/home');
  });

  it('redirects to /home when the user linked before the cutoff', async () => {
    const path = await redirectPathFor({
      linkedAt: BEFORE_CUTOFF,
      onboardingRedirectAfter: CUTOFF,
    });
    expect(path).toBe('/home');
  });

  it('redirects to /onboarding when linked after the cutoff with no onboarding row', async () => {
    const path = await redirectPathFor({
      linkedAt: AFTER_CUTOFF,
      onboardingRedirectAfter: CUTOFF,
    });
    expect(path).toBe('/onboarding');
  });

  it('redirects to /onboarding when onboarding state is NOT_STARTED', async () => {
    const path = await redirectPathFor({
      linkedAt: AFTER_CUTOFF,
      onboardingRedirectAfter: CUTOFF,
      onboardingState: 'NOT_STARTED',
    });
    expect(path).toBe('/onboarding');
  });

  it('redirects to /onboarding when the onboarding row exists but state is null', async () => {
    // A row created by an unrelated partial update, with no state set yet.
    await onboardingRepository.upsert(DID_VALUE, {
      topicsSelected: ['philosophy'],
    });

    const useCase = buildUseCase({
      linkedAt: AFTER_CUTOFF,
      onboardingRedirectAfter: CUTOFF,
    });
    const result = await useCase.execute(VALID_CALLBACK);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.redirectPath).toBe('/onboarding');
    }
  });

  it.each<OnboardingStatus>(['IN_PROGRESS', 'COMPLETED', 'SKIPPED'])(
    'redirects to /home when onboarding state is %s',
    async (onboardingState) => {
      const path = await redirectPathFor({
        linkedAt: AFTER_CUTOFF,
        onboardingRedirectAfter: CUTOFF,
        onboardingState,
      });
      expect(path).toBe('/home');
    },
  );

  it('still signs the user in and falls back to /home when the onboarding lookup fails', async () => {
    const failingRepository: IUserOnboardingRepository = {
      findByUserId: async (): Promise<Result<OnboardingStateRecord | null>> =>
        err(new Error('db unavailable')),
      upsert: async () => err(new Error('db unavailable')),
    };

    const path = await redirectPathFor({
      linkedAt: AFTER_CUTOFF,
      onboardingRedirectAfter: CUTOFF,
      onboardingRepositoryOverride: failingRepository,
    });

    expect(path).toBe('/home');
  });
});
