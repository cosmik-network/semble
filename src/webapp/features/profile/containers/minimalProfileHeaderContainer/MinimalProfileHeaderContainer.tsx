'use client';

import { Box, Container } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import MinimalProfileHeader from '../../components/profileHeader/MinimalProfileHeader';
import { useNavbarContext } from '@/providers/navbar';
import { useMediaQuery } from '@mantine/hooks';

interface Props {
  avatarUrl?: string;
  name: string;
  handle: string;
}

export default function MinimalProfileHeaderContainer(props: Props) {
  const [{ y: yScroll }] = useWindowScroll();
  const { desktopOpened } = useNavbarContext();
  const isMobile = useMediaQuery('(max-width: 48em)', true);
  const HEADER_REVEAL_SCROLL_THRESHOLD = 260;
  const NAVBAR_WIDTH = 300;

  const navbarOffset = !isMobile && desktopOpened ? NAVBAR_WIDTH : 0;

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: navbarOffset,
        width: `calc(100% - ${navbarOffset}px)`,
        zIndex: 2,
        transform: `translateY(${yScroll > HEADER_REVEAL_SCROLL_THRESHOLD ? '0' : '-100px'})`,
        transition: 'transform 300ms ease, left 300ms ease, width 300ms ease',
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
