'use client';

import { Box } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import MinimalProfileHeader from '../../components/profileHeader/MinimalProfileHeader';

interface Props {
  avatarUrl?: string;
  name: string;
  handle: string;
}

export default function MinimalProfileHeaderContainer(props: Props) {
  const [{ y: yScroll }] = useWindowScroll();
  const HEADER_REVEAL_SCROLL_THRESHOLD = 140;

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
      <MinimalProfileHeader
        avatarUrl={props.avatarUrl}
        name={props.name}
        handle={props.handle}
      />
    </Box>
  );
}
