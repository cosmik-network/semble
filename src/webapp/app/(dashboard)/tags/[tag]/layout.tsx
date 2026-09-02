import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import TagTabs from '@/features/tags/components/tagTabs/TagTabs';
import { Box, Container } from '@mantine/core';
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
          <TagTabs tag={tag} />
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
