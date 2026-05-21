import { Center, Container } from '@mantine/core';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up — Semble',
  description: 'Sign up to get started',
  robots: { index: false, follow: true },
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Container>
      <Center h={'100svh'} p={'sm'}>
        {props.children}
      </Center>
    </Container>
  );
}
