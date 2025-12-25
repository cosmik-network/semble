import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import FeedTabs from '@/features/feeds/components/feedTabs/FeedTabs';
import { Paper } from '@mantine/core';

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
      <Paper
        pos={'sticky'}
        top={55}
        style={{ zIndex: 1 }}
        maw={600}
        mx={'auto'}
      >
        <FeedTabs />
      </Paper>

      {props.children}
    </Fragment>
  );
}
