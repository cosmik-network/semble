import { GetOnboardingStateUseCase } from '../../application/use-cases/GetOnboardingStateUseCase';
import { UpdateOnboardingStateUseCase } from '../../application/use-cases/UpdateOnboardingStateUseCase';
import { InMemoryUserOnboardingRepository } from '../infrastructure/InMemoryUserOnboardingRepository';

describe('Onboarding state use cases', () => {
  let repository: InMemoryUserOnboardingRepository;
  let getUseCase: GetOnboardingStateUseCase;
  let updateUseCase: UpdateOnboardingStateUseCase;

  const userId = 'did:plc:testuser';

  beforeEach(() => {
    repository = InMemoryUserOnboardingRepository.getInstance();
    getUseCase = new GetOnboardingStateUseCase(repository);
    updateUseCase = new UpdateOnboardingStateUseCase(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('GetOnboardingStateUseCase', () => {
    it('returns an empty usable state when none exists', async () => {
      const result = await getUseCase.execute({ userId });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe(userId);
        expect(result.value.topicsSelected).toBeNull();
        expect(result.value.onboardingCompleted).toBeNull();
      }
    });
  });

  describe('UpdateOnboardingStateUseCase', () => {
    it('applies PATCH semantics: omitted fields are untouched', async () => {
      const first = await updateUseCase.execute({
        userId,
        update: { topicsSelected: ['a', 'b'] },
      });
      expect(first.isOk()).toBe(true);

      // Second update only touches onboardingCompleted; topicsSelected must remain.
      const second = await updateUseCase.execute({
        userId,
        update: { onboardingCompleted: true },
      });
      expect(second.isOk()).toBe(true);
      if (second.isOk()) {
        expect(second.value.topicsSelected).toEqual(['a', 'b']);
        expect(second.value.onboardingCompleted).toBe(true);
      }

      // GET reflects the merged state.
      const fetched = await getUseCase.execute({ userId });
      expect(fetched.isOk()).toBe(true);
      if (fetched.isOk()) {
        expect(fetched.value.topicsSelected).toEqual(['a', 'b']);
        expect(fetched.value.onboardingCompleted).toBe(true);
      }
    });

    it('lets an explicit null clear a field', async () => {
      await updateUseCase.execute({
        userId,
        update: { firstCollection: 'col-1' },
      });
      const cleared = await updateUseCase.execute({
        userId,
        update: { firstCollection: null },
      });
      expect(cleared.isOk()).toBe(true);
      if (cleared.isOk()) {
        expect(cleared.value.firstCollection).toBeNull();
      }
    });
  });
});
