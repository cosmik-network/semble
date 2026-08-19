import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import FeedControlsBar from '@/features/feeds/components/feedControls/FeedControlsBar';

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
      <FeedControlsBar />
      {props.children}
    </Fragment>
  );
}
