import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export const metadata: Metadata = {
  title: 'Canvases',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  await verifySessionOnServer({ redirectOnFail: true });

  return (
    <Fragment>
      <Header title="Canvases" />
      {props.children}
    </Fragment>
  );
}
