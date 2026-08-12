'use client';

import type { ReactNode } from 'react';
import { BackgroundImage, Box, Container, Stack } from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';

// Gone by 20%, so the stages read on the plain surface rather than over
// photography. The `-webkit-` prefix is still needed for older Safari.
const ARTWORK_MASK =
  'linear-gradient(to bottom, black 0%, black 6%, transparent 20%)';

const ARTWORK_FADE = {
  maskImage: ARTWORK_MASK,
  WebkitMaskImage: ARTWORK_MASK,
};

// Softens the top of the scroll area — the header has no background of its
// own. Anchored to the scroll box, not the content, so it stays at the edge.
const SCROLL_MASK =
  'linear-gradient(to bottom, transparent 0, black 24px, black 100%)';

/**
 * One measure for every stage and for the footer bar beneath them. A Container
 * size rather than a width: OnboardingFooter uses the same one, which is what
 * aligns the two without either naming a number.
 */
export const CONTENT_SIZE = 'md';

interface Props {
  header: ReactNode;
  /** Omitted on the returning view — there is no Back/Continue outside the flow. */
  footer?: ReactNode;
  children: ReactNode;
}

/** The shell shared by the flow and the returning view. */
export default function OnboardingScreen(props: Props) {
  return (
    <Box pos="relative" h={'100svh'} w={'100%'}>
      {/* Two elements rather than one swapped src: a hidden element's
          background is never fetched, so the inactive scheme costs nothing. */}
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

      {/* Nothing is positioned: the body takes the space the other two leave,
          which is what lets the footer be a row rather than an overlay. */}
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
