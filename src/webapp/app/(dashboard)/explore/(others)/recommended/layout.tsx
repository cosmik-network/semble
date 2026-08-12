import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Container, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Recommended',
  description: 'Recommended cards',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header>
        <BackButton />
      </Header>

      <Container p={'xs'} size={'xl'}>
        <Title order={2}>Recommended</Title>
      </Container>

      {props.children}
    </Fragment>
  );
}
