import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { Box } from '@mantine/core';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for cards, collections, and more',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Box pos={'relative'}>
      <Header title="Search">
        <BackButton href="/home">Home</BackButton>
      </Header>

      {props.children}
    </Box>
  );
}
