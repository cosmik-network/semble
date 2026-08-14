import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set up your account — Semble',
  description:
    'Pick your topics, save your first cards, and find people to follow on Semble.',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return props.children;
}
