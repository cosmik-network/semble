import { cache } from 'react';
import { createServerSembleClient } from '@/services/server.apiClient';

/** The dal.ts twin authenticates through the browser and cannot run in SSR. */
export const getOnboardingState = cache(async () => {
  const client = await createServerSembleClient();
  return client.getOnboardingState();
});
