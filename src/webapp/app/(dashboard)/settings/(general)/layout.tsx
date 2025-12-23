import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Settings',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="Settings">
        <BackButton href="/home">Home</BackButton>
      </Header>
      {props.children}
    </Fragment>
  );
}
