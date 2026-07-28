'use client';

import { ActionIcon, Box, useMantineColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  MdOutlineDarkMode,
  MdOutlineLightMode,
  MdOutlineSmartphone,
} from 'react-icons/md';

const schemes = ['light', 'dark', 'auto'] as const;
type ColorScheme = (typeof schemes)[number];

const icons = {
  light: MdOutlineLightMode,
  dark: MdOutlineDarkMode,
  auto: MdOutlineSmartphone,
};

/**
 * Cycles light → dark → auto. The icon shows the selected scheme, and "auto"
 * is only knowable on the client, so before hydration both light and dark
 * icons are rendered and CSS shows whichever matches the scheme that
 * ColorSchemeScript stamps on <html> — that keeps the SSR markup correct.
 */
export default function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = colorScheme as ColorScheme;
  const next = schemes[(schemes.indexOf(current) + 1) % schemes.length];
  const Icon = icons[current];

  return (
    <ActionIcon
      onClick={() => setColorScheme(next)}
      variant="subtle"
      color="white"
      radius="xl"
      size="xl"
      aria-label={
        mounted
          ? `Color scheme: ${current}. Switch to ${next}`
          : 'Change color scheme'
      }
    >
      {mounted ? (
        <Icon size={22} />
      ) : (
        <>
          <Box darkHidden display="flex">
            <MdOutlineLightMode size={22} />
          </Box>
          <Box lightHidden display="flex">
            <MdOutlineDarkMode size={22} />
          </Box>
        </>
      )}
    </ActionIcon>
  );
}
