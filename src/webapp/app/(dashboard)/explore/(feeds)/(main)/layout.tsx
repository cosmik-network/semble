import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import FeedControls from '@/features/feeds/components/feedControls/FeedControls';
import { Paper } from '@mantine/core';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Explore',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="Explore">
        <BackButton />
      </Header>
      <Paper
        pos={'sticky'}
        top={55}
        style={{
          zIndex: 1,
        }}
        maw={620}
        p={'xs'}
        radius={0}
        mx={'auto'}
      >
        <FeedControls />
      </Paper>

      {props.children}
    </Fragment>
  );
}
