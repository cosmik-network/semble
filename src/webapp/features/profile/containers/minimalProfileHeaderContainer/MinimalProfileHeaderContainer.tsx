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
        // AppShell keeps this at the navbar width when the navbar is visible
        // and 0 when it is collapsed or below its breakpoint
        left: 'var(--app-shell-navbar-offset, 0px)',
        right: 0,
        // Must sit above the sticky page Header (zIndex 100) it replaces
        zIndex: 101,
        opacity: yScroll > HEADER_REVEAL_SCROLL_THRESHOLD ? 1 : 0,
        pointerEvents:
          yScroll > HEADER_REVEAL_SCROLL_THRESHOLD ? 'auto' : 'none',
        transition:
          'opacity 300ms ease, left var(--app-shell-transition-duration, 200ms) var(--app-shell-transition-timing-function, ease)',
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
