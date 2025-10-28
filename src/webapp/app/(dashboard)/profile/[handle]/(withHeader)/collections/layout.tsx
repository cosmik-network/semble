import { getProfile } from '@/features/profile/lib/dal';
import type { Metadata } from 'next';
import { Fragment } from 'react';

interface Props {
  params: Promise<{ handle: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle);

  return {
    title: `${profile.name}'s collections`,
    description: `Explore ${profile.name}'s collections on Semble`,
  };
}

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return <Fragment>{props.children}</Fragment>;
}
