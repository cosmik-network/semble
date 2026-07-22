import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Semble for Claude',
  description:
    'Connect Claude to Semble — save and connect URLs, build collections, and run deep research over your network.',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return props.children;
}
