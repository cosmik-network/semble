import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import FeedControlsBar from '@/features/feeds/components/feedControls/FeedControlsBar';
import HomeVisitTracker from '@/features/feeds/components/homeVisitTracker/HomeVisitTracker';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Home',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="Home" />
      <HomeVisitTracker />
      <FeedControlsBar />
      {props.children}
    </Fragment>
  );
}
