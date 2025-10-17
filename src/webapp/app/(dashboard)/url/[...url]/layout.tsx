import type { Metadata } from 'next';
import Header from '@/components/navigation/header/Header';
import { Fragment } from 'react';

interface Props {
  params: Promise<{ url: string[] }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { url } = await params;

  return {
    title: `Semble | ${url}`,
    description: `Semble page for ${url}`,
  };
}

export default async function Layout(props: Props) {
  return (
    <Fragment>
      <Header />
      {props.children}
    </Fragment>
  );
}
