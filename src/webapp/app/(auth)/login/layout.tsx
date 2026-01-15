import { Center, Container } from '@mantine/core';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in — Semble',
  description: 'Welcome back',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  return (
    <Container>
      <Center h={'100svh'} p={'sm'}>
        {props.children}
      </Center>
    </Container>
  );
}
