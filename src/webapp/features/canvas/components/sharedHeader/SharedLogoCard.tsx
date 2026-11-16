'use client';

import { Anchor, Image, Paper } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { RADIUS } from './SharedHeader';

const LOGO_HEIGHT = 22;

// Same height as the header beside it: 28px controls plus padding and border
export default function SharedLogoCard() {
  return (
    <Paper
      withBorder
      shadow="sm"
      radius={RADIUS}
      py={(28 + 12 - LOGO_HEIGHT) / 2}
      px={12}
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Anchor href="/" style={{ display: 'flex' }}>
        <Image
          src={SembleLogo.src}
          alt="Semble"
          h={LOGO_HEIGHT}
          w={(LOGO_HEIGHT * 20.84) / 28}
        />
      </Anchor>
    </Paper>
  );
}
