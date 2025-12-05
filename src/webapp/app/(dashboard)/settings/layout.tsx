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
  return <Fragment>{props.children}</Fragment>;
}
