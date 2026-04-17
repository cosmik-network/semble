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
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          background:
            'color-mix(in srgb, var(--mantine-color-body) 100%, transparent)',
          maskImage:
            'linear-gradient(to bottom, black 0%, black calc(100% - 50px), rgba(0,0,0,0.5) calc(100% - 25px), transparent 100%), linear-gradient(to right, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%)',
          maskComposite: 'intersect',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black calc(100% - 50px), rgba(0,0,0,0.5) calc(100% - 25px), transparent 100%), linear-gradient(to right, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%)',
          WebkitMaskComposite: 'destination-in',
        }}
        maw={620}
        p={'xs'}
        pb={'50'}
        radius={0}
        mx={'auto'}
      >
        <FeedControls />
      </Paper>

      {props.children}
    </Fragment>
  );
}
