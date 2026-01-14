import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore — Gems of 2025',
  description: 'Top picks from our community',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return props.children;
}
