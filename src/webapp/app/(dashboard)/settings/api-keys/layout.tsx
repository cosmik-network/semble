import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'API Keys',
  description: 'Manage API keys for the Semble API',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="API Keys">
        <BackButton />
      </Header>
      {props.children}
    </Fragment>
  );
}
