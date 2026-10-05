import NotificationsContainer from '@/features/notifications/containers/notificationsContainer/NotificationsContainer';
import NotificationsContainerSkeleton from '@/features/notifications/containers/notificationsContainer/Skeleton.NotificationsContainer';
import ClientOnly from '@/components/utils/ClientOnly';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { Suspense } from 'react';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  // NotificationsContainer's useMyNotifications is an authed suspense query
  // with no server-side seed — rendered during SSR it throws NoSessionError.
  return (
    <ClientOnly fallback={<NotificationsContainerSkeleton />}>
      <Suspense fallback={<NotificationsContainerSkeleton />}>
        <NotificationsContainer />
      </Suspense>
    </ClientOnly>
  );
}
