import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';

export const metadata: Metadata = {
  title: 'Canvas — Semble',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  await verifySessionOnServer({ redirectOnFail: true });

  const flags = await getServerFeatureFlags();
  if (!flags.canvas) notFound();

  return props.children;
}
