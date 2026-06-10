import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install Semble',
  description:
    'Learn how to install Semble as a progressive web app (PWA) on your phone or computer — straight from your browser, no app store needed.',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return props.children;
}
