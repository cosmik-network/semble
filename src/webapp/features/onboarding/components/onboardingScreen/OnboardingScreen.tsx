'use client';

import type { ReactNode } from 'react';
import { BackgroundImage, Box, Container, Stack } from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';

interface Props {
  header: ReactNode;
  /** Omitted on the returning view — there is no Back/Continue outside the flow. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The full-height header/scrollable-body/optional-footer shell shared by the
 * flow and the returning view. Pulled out so the two screens can't drift on
 * padding or overflow behavior independently — they're the same shell with
 * different content.
 */
export default function OnboardingScreen(props: Props) {
  return (
    <Box pos="relative" h={'100svh'} w={'100%'}>
      {/* The same artwork as the welcome screen and the landing page, so the
          whole flow sits in one place rather than dropping onto a bare page
          after the welcome. It stays put while the body scrolls over it.

          Two elements rather than one swapped src: a hidden element's
          background is never fetched, so the inactive scheme costs nothing. */}
      <BackgroundImage src={BG.src} darkHidden pos={'absolute'} h={'100%'} />
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        pos={'absolute'}
        h={'100%'}
      />

      {/* Relative so the footer can float against the bottom of the screen
          rather than sit in the flow — see OnboardingFooter. */}
      <Stack h={'100%'} gap={0} pos="relative" style={{ zIndex: 1 }}>
        {props.header}

        <Container
          size={'md'}
          flex={1}
          w={'100%'}
          pt={'xl'}
          // Enough room to scroll the last card clear of the floating footer,
          // which no longer takes space of its own: the pill is ~56px tall and
          // sits 12px off the bottom, so this leaves a comfortable gap above
          // it. Without a footer there is nothing to clear.
          pb={props.footer ? 88 : 'xl'}
          px={'md'}
          style={{ overflowY: 'auto' }}
        >
          {props.children}
        </Container>

        {props.footer}
      </Stack>
    </Box>
  );
}
