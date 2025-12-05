import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import SettingsContainer from '@/features/settings/containers/settingsContainer/SettingsContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { redirect } from 'next/navigation';
import { Fragment } from 'react';

export default async function Page() {
  const session = await verifySessionOnServer();
  if (!session) redirect('/login');

  return (
    <Fragment>
      <Header>
        <BackButton href="/home">Home</BackButton>
      </Header>
      <SettingsContainer />
    </Fragment>
  );
}
