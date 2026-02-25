'use client';

import { Box, Container } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import MinimalProfileHeader from '../../components/profileHeader/MinimalProfileHeader';

interface Props {
  avatarUrl?: string;
  name: string;
  handle: string;
}

export default function MinimalProfileHeaderContainer(props: Props) {
  const [{ y: yScroll }] = useWindowScroll();
  const HEADER_REVEAL_SCROLL_THRESHOLD = 260;

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 2,
        transform: `translateY(${yScroll > HEADER_REVEAL_SCROLL_THRESHOLD ? '0' : '-100px'})`,
        transition: 'transform 300ms ease',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Container p={0} size={'xl'}>
        <MinimalProfileHeader
          avatarUrl={props.avatarUrl}
          name={props.name}
          handle={props.handle}
        />
      </Container>
    </Box>
  );
}
