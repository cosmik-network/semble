'use client';

import {
  QueryClient,
  QueryClientProvider,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error: any) => {
          // Don't retry auth errors - handle them immediately
          if (error?.status === 401) {
            return false;
          }
          // Retry other errors up to 3 times
          return failureCount < 3;
        },
        onError: (error: any) => {
          // Handle 401s globally by triggering auth refresh
          if (error?.status === 401) {
            handleAuthError();
          }
        },
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // Don't retry auth errors
          if (error?.status === 401) {
            return false;
          }
          return failureCount < 3;
        },
        onError: (error: any) => {
          // Handle 401s globally for mutations too
          if (error?.status === 401) {
            handleAuthError();
          }
        },
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

// Global auth error handler
function handleAuthError() {
  // Trigger token refresh by calling the auth endpoint
  fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) {
        // Refresh failed - redirect to login
        window.location.href = '/login';
      } else {
        // Refresh succeeded - reload the page to retry failed requests
        window.location.reload();
      }
    })
    .catch(() => {
      // Network error or other issue - redirect to login
      window.location.href = '/login';
    });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface Props {
  children: React.ReactNode;
}
export default function TanStackQueryProvider(props: Props) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
