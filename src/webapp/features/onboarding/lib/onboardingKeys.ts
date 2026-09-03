export const onboardingKeys = {
  all: () => ['onboarding'] as const,
  state: () => [...onboardingKeys.all(), 'state'] as const,
  recommendedCardsInfinite: (queries: string[], limit?: number) =>
    [
      ...onboardingKeys.all(),
      'recommendedCards',
      'infinite',
      limit,
      ...queries,
    ] as const,
};
