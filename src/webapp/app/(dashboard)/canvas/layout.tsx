import Header from '@/components/navigation/header/Header';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';

export const metadata: Metadata = {
  title: 'Canvases',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  await verifySessionOnServer({ redirectOnFail: true });

  const flags = await getServerFeatureFlags();
  if (!flags.canvas) notFound();

  return (
    <Fragment>
      <Header title="Canvases" />
      {props.children}
    </Fragment>
  );
}
