import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import ReaderHeaderButton from '@/features/reader/components/ReaderHeaderButton/ReaderHeaderButton';
import ShareHeaderButton from '@/features/semble/components/ShareHeaderButton/ShareHeaderButton';
import { SembleNavigationProvider } from '@/features/semble/lib/sembleNavigation';
import { Suspense } from 'react';

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  return (
    <SembleNavigationProvider>
      <Header>
        <BackButton />
        <Suspense fallback={null}>
          <ReaderHeaderButton />
        </Suspense>
        <Suspense fallback={null}>
          <ShareHeaderButton />
        </Suspense>
      </Header>
      {props.children}
    </SembleNavigationProvider>
  );
}
