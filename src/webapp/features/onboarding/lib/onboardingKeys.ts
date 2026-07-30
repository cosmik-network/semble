export const onboardingKeys = {
  all: () => ['onboarding'] as const,
  recommendedCards: (queries: string[]) =>
    [...onboardingKeys.all(), 'recommendedCards', ...queries] as const,
  recommendedUsers: (urls: string[]) =>
    [...onboardingKeys.all(), 'recommendedUsers', ...urls] as const,
  recommendedCollections: (urls: string[]) =>
    [...onboardingKeys.all(), 'recommendedCollections', ...urls] as const,
};
