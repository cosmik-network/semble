'use client';

import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { MdOutlineDarkMode, MdOutlineLightMode } from 'react-icons/md';

/**
 * Both buttons are always rendered — CSS shows whichever matches the color
 * scheme that ColorSchemeScript stamps on <html> before first paint. Nothing
 * depends on client-only state, so it is correct in the SSR markup.
 */
export default function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <>
      <ActionIcon
        darkHidden
        onClick={() => setColorScheme('dark')}
        variant="subtle"
        color="white"
        radius="xl"
        size="xl"
        aria-label="Switch to dark mode"
      >
        <MdOutlineDarkMode size={22} />
      </ActionIcon>

      <ActionIcon
        lightHidden
        onClick={() => setColorScheme('light')}
        variant="subtle"
        color="white"
        radius="xl"
        size="xl"
        aria-label="Switch to light mode"
      >
        <MdOutlineLightMode size={22} />
      </ActionIcon>
    </>
  );
}
