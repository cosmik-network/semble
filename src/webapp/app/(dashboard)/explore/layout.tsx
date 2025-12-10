import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Explore',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  const session = await verifySessionOnServer();

  return (
    <Fragment>
      <Header title="Explore">
        {session ? (
          <BackButton href="/home">Home</BackButton>
        ) : (
          <BackButton href="/">Learn more</BackButton>
        )}
      </Header>
      {props.children}
    </Fragment>
  );
}
