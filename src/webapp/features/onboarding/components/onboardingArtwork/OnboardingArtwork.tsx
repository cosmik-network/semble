'use client';

import { BackgroundImage } from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';

// How far down each surface the artwork survives before fading out. The
// `-webkit-` prefix is still needed for older Safari.
const FADE = {
  screen: 'linear-gradient(to bottom, black 0%, black 6%, transparent 20%)',
  welcome: 'linear-gradient(to bottom, black 0%, black 15%, transparent 45%)',
  banner: 'linear-gradient(to bottom, black 0%, black 35%, transparent 90%)',
};

interface Props {
  variant: keyof typeof FADE;
}

export default function OnboardingArtwork(props: Props) {
  const mask = FADE[props.variant];

  const style = { maskImage: mask, WebkitMaskImage: mask };

  // The banner is a card and fills its box; the others fill the viewport.
  const fill =
    props.variant === 'banner'
      ? ({ inset: 0 } as const)
      : ({ h: '100%' } as const);

  return (
    <>
      <BackgroundImage
        src={BG.src}
        darkHidden
        pos="absolute"
        {...fill}
        style={style}
      />
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        pos="absolute"
        {...fill}
        style={style}
      />
    </>
  );
}
