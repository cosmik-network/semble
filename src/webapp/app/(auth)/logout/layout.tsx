import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Logging out — Semble',
  robots: { index: false, follow: true },
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return props.children;
}
