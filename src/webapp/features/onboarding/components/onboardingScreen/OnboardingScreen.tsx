'use client';

import type { ReactNode } from 'react';
import { Box, Container, Stack } from '@mantine/core';
import OnboardingArtwork from '../onboardingArtwork/OnboardingArtwork';

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
      <OnboardingArtwork variant="screen" />

      <Stack h={'100%'} gap={0} pos="relative" style={{ zIndex: 1 }}>
        {props.header}

        <Container
          size={CONTENT_SIZE}
          flex={1}
          w={'100%'}
          pt={'xl'}
          pb={'xl'}
          px={'md'}
          style={{
            overflowY: 'auto',
            maskImage: SCROLL_MASK,
            WebkitMaskImage: SCROLL_MASK,
          }}
        >
          {props.children}
        </Container>

        {props.footer}
      </Stack>
    </Box>
  );
}
