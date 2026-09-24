import type { Metadata } from 'next';
import Dashboard from '@/components/navigation/dashboard/Dashboard';

export const metadata: Metadata = {
  title: {
    template: '%s — Semble',
    default: 'Semble',
  },
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return <Dashboard>{props.children}</Dashboard>;
}
