import {
  QueryClient,
  QueryCache,
  MutationCache,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query';

type ErrorHandler = (error: unknown) => void;

/**
 * Creates a QueryClient. Kept free of `'use client'` and of any browser-only
 * imports so Server Components can build one too — the auth error handler is
 * injected by the client provider rather than imported here.
 */
export function makeQueryClient(onError?: ErrorHandler) {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error) => onError?.(error) }),
    mutationCache: new MutationCache({ onError: (error) => onError?.(error) }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      dehydrate: {
        // include pending queries in dehydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}

/**
 * A throwaway QueryClient for one server-side prefetch boundary.
 *
 * Each Server Component that prefetches makes its own, dehydrates it, and
 * renders its own HydrationBoundary. Hydration merges them into the single
 * browser client, so separate boundaries cost nothing and — unlike a shared
 * request-scoped client — never serialize the same query into the payload twice.
 *
 * Server Components only. The browser singleton lives in providers/tanstack.tsx.
 */
export function makeServerQueryClient() {
  return makeQueryClient();
}
