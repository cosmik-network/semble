import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Semble iOS shortcut',
  description:
    'Learn how to add our shortcut to your iPhone or iPad to quickly open any webpage in Semble.',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return props.children;
}
