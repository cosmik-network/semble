import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import {
  Container,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
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
          <Tooltip label="These collections are open to everyone. You can add cards to help them grow.">
            <ThemeIcon
              size={'md'}
              variant="light"
              color={'green'}
              radius={'xl'}
            >
              <FaSeedling size={14} />
            </ThemeIcon>
          </Tooltip>

          <Title order={2}>Open Collections</Title>
        </Group>
      </Container>

      {props.children}
    </Fragment>
  );
}
