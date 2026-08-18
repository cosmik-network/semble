import { ok } from 'src/shared/core/Result';
import { InitiateOAuthSignInUseCase } from '../../application/use-cases/InitiateOAuthSignInUseCase';
import { IOAuthProcessor } from '../../application/services/IOAuthProcessor';

describe('InitiateOAuthSignInUseCase', () => {
  let generateAuthUrlCalls: Array<{
    handle?: string;
    options?: { redirectPath?: string };
  }>;
  let oauthProcessor: IOAuthProcessor;
  let useCase: InitiateOAuthSignInUseCase;

  beforeEach(() => {
    generateAuthUrlCalls = [];
    oauthProcessor = {
      generateAuthUrl: async (handle?: string, options?) => {
        generateAuthUrlCalls.push({ handle, options });
        return ok('https://example.com/authorize');
      },
      processCallback: async () => ok({ did: 'did:plc:testuser' }),
    };
    useCase = new InitiateOAuthSignInUseCase(oauthProcessor);
  });

  it('passes a safe redirect path through to the OAuth processor', async () => {
    const result = await useCase.execute({
      handle: 'alice.bsky.social',
      redirect: '/url?id=https%3A%2F%2Fexample.com',
    });

    expect(result.isOk()).toBe(true);
    expect(generateAuthUrlCalls).toEqual([
      {
        handle: 'alice.bsky.social',
        options: { redirectPath: '/url?id=https%3A%2F%2Fexample.com' },
      },
    ]);
  });

  it.each(['https://evil.com/phish', '//evil.com', 'home', '/\\evil.com'])(
    'drops an unsafe redirect %p instead of failing sign-in',
    async (redirect) => {
      const result = await useCase.execute({
        handle: 'alice.bsky.social',
        redirect,
      });

      expect(result.isOk()).toBe(true);
      expect(generateAuthUrlCalls[0]?.options?.redirectPath).toBeUndefined();
    },
  );

  it('omits the redirect option when none is provided', async () => {
    const result = await useCase.execute({ handle: 'alice.bsky.social' });

    expect(result.isOk()).toBe(true);
    expect(generateAuthUrlCalls[0]?.options?.redirectPath).toBeUndefined();
  });
});
