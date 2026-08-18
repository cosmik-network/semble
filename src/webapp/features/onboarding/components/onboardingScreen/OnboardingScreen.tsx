'use client';

import type { ReactNode } from 'react';
import { Box, Container, Stack } from '@mantine/core';
import OnboardingBackground from '../onboardingBackground/OnboardingBackground';

const SCROLL_MASK =
  'linear-gradient(to bottom, transparent 0, black 24px, black 100%)';

export const CONTENT_SIZE = 'md';

interface Props {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export default function OnboardingScreen(props: Props) {
  return (
    <Box pos="relative" h={'100svh'} w={'100%'}>
      <OnboardingBackground variant="screen" />

      <Stack h={'100%'} gap={0} pos="relative" style={{ zIndex: 1 }}>
        {props.header}

        {/* The scroller must span the full viewport width so its scrollbar
            sits at the window edge; the centering Container lives inside. */}
        <Box
          flex={1}
          w={'100%'}
          style={{
            overflowY: 'auto',
            maskImage: SCROLL_MASK,
            WebkitMaskImage: SCROLL_MASK,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Container
            size={CONTENT_SIZE}
            flex={1}
            w={'100%'}
            py={'xl'}
            px={'md'}
          >
            {props.children}
          </Container>
        </Box>

        {props.footer}
      </Stack>
    </Box>
  );
}
