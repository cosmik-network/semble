import Header from '@/components/navigation/header/Header';
import { Fragment } from 'react';

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  return (
    <Fragment>
      <Header />
      {props.children}
    </Fragment>
  );
}
