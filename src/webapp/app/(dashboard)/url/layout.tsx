import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import ReaderHeaderButton from '@/features/reader/components/ReaderHeaderButton/ReaderHeaderButton';
import ShareHeaderButton from '@/features/semble/components/ShareHeaderButton/ShareHeaderButton';
import { Fragment, Suspense } from 'react';

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  return (
    <Fragment>
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
    </Fragment>
  );
}
