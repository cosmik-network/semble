import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import ReaderHeaderButton from '@/features/reader/components/ReaderHeaderButton/ReaderHeaderButton';
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
      </Header>
      {props.children}
    </Fragment>
  );
}
