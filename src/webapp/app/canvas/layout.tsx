import type { Metadata } from 'next';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export const metadata: Metadata = {
  title: 'Canvas — Semble',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  await verifySessionOnServer({ redirectOnFail: true });

  return props.children;
}
