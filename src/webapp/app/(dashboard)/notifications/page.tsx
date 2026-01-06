import NotificationsContainer from '@/features/notifications/containers/notificationsContainer/NotificationsContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  return <NotificationsContainer />;
}
