import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Container } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tag: string }>;
}

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await props.params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `Cards, connections, and collections tagged #${decoded}`,
  };
}

export default async function Layout(props: Props) {
  const { tag } = await props.params;
  const decoded = decodeURIComponent(tag).toLowerCase();

  return (
    <Fragment>
      <Header title={`#${decoded}`}>
        <BackButton />
      </Header>
      <Container p={'xs'} size={'sm'}>
        <Container py={'xs'} px={0} size={'xl'}>
          {props.children}
        </Container>
      </Container>
    </Fragment>
  );
}
