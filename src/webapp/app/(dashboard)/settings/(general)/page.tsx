import SettingsContainer from '@/features/settings/containers/settingsContainer/SettingsContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await verifySessionOnServer();
  if (!session) redirect('/login');

  return <SettingsContainer />;
}
