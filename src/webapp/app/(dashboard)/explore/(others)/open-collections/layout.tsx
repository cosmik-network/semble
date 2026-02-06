import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Container, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { FaSeedling } from 'react-icons/fa6';

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
        <Group gap={'xs'}>
          <ThemeIcon size={'md'} variant="light" color={'green'} radius={'xl'}>
            <FaSeedling size={14} />
          </ThemeIcon>
          <Title order={2}>Open Collections</Title>
        </Group>
      </Container>

      {props.children}
    </Fragment>
  );
}
