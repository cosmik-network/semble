'use client';

import {
  QueryClient,
  QueryClientProvider,
  environmentManager,
} from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { BsExclamation } from 'react-icons/bs';
import { ApiError } from '@/api-client/errors';
import { logoutUser } from '@/lib/auth/dal';
import { makeQueryClient } from '@/lib/queryClient';

// Fixed id so several requests failing together show a single notice.
const PDS_UNAVAILABLE_NOTIFICATION_ID = 'pds-unavailable';

function handleAuthError(error: unknown) {
  if (!(error instanceof ApiError)) return;

  if (error.statusCode === 401) {
    logoutUser(error);
    return;
  }

  // The backend couldn't use the user's PDS session right now but doesn't
  // consider it dead, so they stay signed in. Shown alongside the action's
  // own error toast to explain what to do about it.
  if (error.code === 'PDS_UNAVAILABLE') {
    notifications.show({
      id: PDS_UNAVAILABLE_NOTIFICATION_ID,
      color: 'red',
      title: 'Couldn’t reach your PDS',
      message:
        'Please try again in a moment. If this keeps happening, log out and back in.',
      position: 'top-center',
      autoClose: 10000,
      withCloseButton: true,
      icon: <BsExclamation />,
    });
  }
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (environmentManager.isServer()) {
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
