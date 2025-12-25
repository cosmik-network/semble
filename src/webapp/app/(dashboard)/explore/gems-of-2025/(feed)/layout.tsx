import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import FeedTabs from '@/features/feeds/components/feedTabs/FeedTabs';
import { Button, Paper } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Explore — Gems of 2025',
  description: 'Top picks from our community',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  const session = await verifySessionOnServer();

  return (
    <Fragment>
      <Header title="Explore (Gems of 2025)">
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
        <Button
          component={Link}
          href={'/explore/gems-of-2025/collections'}
          variant="light"
          color="grape"
          radius={0}
          leftSection={<BiCollection size={18} />}
          fullWidth
        >
          View Gem Collections
        </Button>
      </Paper>

      {props.children}
    </Fragment>
  );
}
