import { createServerSembleClient } from '@/services/server.apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
}

/**
 * Server-only version of getMyUrlCards. Authenticates by forwarding the caller's
 * access token, which the client DAL cannot do from a server render (it relies
 * on the browser sending HttpOnly cookies via `credentials: include`).
 *
 * Use in Server Components to prefetch into the same query key the client hook
 * reads. For Client Components use getMyUrlCards from dal.ts.
 */
export const getMyUrlCards = cache(async (params?: PageParams) => {
  const client = await createServerSembleClient();

  return client.getMyUrlCards({
    page: params?.page,
    limit: params?.limit,
  });
});
