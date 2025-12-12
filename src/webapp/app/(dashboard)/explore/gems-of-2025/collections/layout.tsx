import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Gems of 2025 Collections',
  description: 'Gems of 2025 Collections',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="Gems of 2025">
        <BackButton href="/explore/gems-of-2025">Explore</BackButton>
      </Header>

      {props.children}
    </Fragment>
  );
}
