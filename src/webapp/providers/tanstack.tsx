'use client';

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query';
import { ApiError } from '@/api-client/errors';
import { logoutUser } from '@/lib/auth/dal';
import { makeQueryClient } from '@/lib/queryClient';

function handleAuthError(error: unknown) {
  if (error instanceof ApiError && error.statusCode === 401) {
    logoutUser();
  }
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient(handleAuthError);
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient)
      browserQueryClient = makeQueryClient(handleAuthError);
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
