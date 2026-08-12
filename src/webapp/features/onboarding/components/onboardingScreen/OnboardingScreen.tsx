'use client';

import type { ReactNode } from 'react';
import { BackgroundImage, Box, Container, Stack } from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';

const ARTWORK_MASK =
  'linear-gradient(to bottom, black 0%, black 6%, transparent 20%)';

const ARTWORK_FADE = {
  maskImage: ARTWORK_MASK,
  WebkitMaskImage: ARTWORK_MASK,
};

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
      <BackgroundImage
        src={BG.src}
        darkHidden
        pos={'absolute'}
        h={'100%'}
        style={ARTWORK_FADE}
      />
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        pos={'absolute'}
        h={'100%'}
        style={ARTWORK_FADE}
      />

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
