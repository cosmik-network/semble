import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Fragment } from 'react';

interface Props {
  params: Promise<{ handle: string }>;
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  const { handle } = await props.params;

  return (
    <Fragment>
      <Header title="Following">
        <BackButton href={`/profile/${handle}`}>{`@${handle}`}</BackButton>
      </Header>
      {props.children}
    </Fragment>
  );
}
