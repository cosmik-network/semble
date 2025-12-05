import NotificationsContainer from '@/features/notifications/containers/notificationsContainer/NotificationsContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await verifySessionOnServer();
  if (!session) redirect('/explore');

  return <NotificationsContainer />;
}
