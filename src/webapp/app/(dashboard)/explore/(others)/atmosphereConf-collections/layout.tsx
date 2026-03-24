import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Container, Group, ThemeIcon, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'AtmosphereConf Collections',
  description: 'AtmosphereConf Collections',
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
        <Group gap={'xs'}>
          <ThemeIcon size={'md'} variant="light" color={'blue'} radius={'xl'}>
            🪿
          </ThemeIcon>

          <Title order={2}>AtmosphereConf Collections</Title>
        </Group>
      </Container>

      {props.children}
    </Fragment>
  );
}
