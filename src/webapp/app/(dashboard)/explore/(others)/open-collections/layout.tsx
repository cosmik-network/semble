import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Container, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Open Collections',
  description: 'Open Collections',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header>
        <BackButton href="/explore">Explore</BackButton>
      </Header>

      <Container p={'xs'} size={'xl'}>
        <Title order={2}>Open Collections</Title>
      </Container>

      {props.children}
    </Fragment>
  );
}
