import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Bluesky Follows',
  description: 'Semble users you follow on Bluesky',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="Bluesky Follows">
        <BackButton />
      </Header>
      {props.children}
    </Fragment>
  );
}
