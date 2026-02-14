'use client';

import { useQuery } from '@tanstack/react-query';

interface FeatureFlags {
  cardSearch: boolean;
  urlTypeFilter: boolean;
  leafletMentions: boolean;
  animatedLandingTitle: boolean;
  openCollections: boolean;
  following: boolean;
}

async function fetchFeatureFlags(): Promise<FeatureFlags> {
  const response = await fetch('/api/feature-flags');
  if (!response.ok) {
    throw new Error('Failed to fetch feature flags');
  }
  return response.json();
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
