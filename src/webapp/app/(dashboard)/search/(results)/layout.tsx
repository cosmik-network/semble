import SearchTabs from '@/features/search/components/searchTabs/SearchTabs';
import { Box, Container } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for cards, collections, and more',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Box
        style={{
          position: 'sticky',
          top: 55,
          zIndex: 1,
        }}
        pt={'xs'}
        bg={'var(--mantine-color-body)'}
      >
        <Container px={'xs'} pt={0} size={'sm'}>
          <SearchTabs />
        </Container>
      </Box>
      <Container p={'xs'} pt={0} size={'sm'}>
        <Container py={'xs'} px={0} size={'xl'}>
          {props.children}
        </Container>
      </Container>
    </Fragment>
  );
}
