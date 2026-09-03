'use client';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine/lightbox/styles.css';
import { theme } from '@/styles/theme';
import {
  MantineProvider as BaseProvider,
  useMantineColorScheme,
  v8CssVariablesResolver,
  type CSSVariablesResolver,
} from '@mantine/core';
import {
  CodeHighlightAdapterProvider,
  createShikiAdapter,
} from '@mantine/code-highlight';
import { useHotkeys } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';

interface Props {
  children: React.ReactNode;
}

// Shiki requires async code to load the highlighter
async function loadShiki() {
  const { createHighlighter } = await import('shiki');
  const shiki = await createHighlighter({
    langs: ['html', 'css', 'js', 'ts', 'tsx', 'json'],
    themes: [],
  });

  return shiki;
}

const shikiAdapter = createShikiAdapter(loadShiki);

/**
 * Mantine's default `dimmed` is gray.6 on light and dark.2 on dark — 3.32:1 and
 * 4.04:1 against the body, both under the 4.5:1 AA floor for normal text.
 * dark.3 / dark.1 clear it (5.49:1 / 7.83:1) and still read as secondary.
 *
 * No single shade passes on both backgrounds, which is why this is a per-scheme
 * override rather than a palette change.
 */
const cssVariablesResolver: CSSVariablesResolver = (theme) => {
  const base = v8CssVariablesResolver(theme);

  return {
    ...base,
    light: {
      ...base.light,
      '--mantine-color-dimmed': theme.colors.dark[3],
    },
    dark: {
      ...base.dark,
      '--mantine-color-dimmed': theme.colors.dark[1],
    },
  };
};

const schemes = ['light', 'dark', 'auto'] as const;
type ColorScheme = (typeof schemes)[number];

function ThemeHotkey() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  useHotkeys([
    [
      'ctrl+shift+T',
      () => {
        const idx = schemes.indexOf(colorScheme as ColorScheme);
        setColorScheme(schemes[(idx + 1) % schemes.length]);
      },
    ],
  ]);
  return null;
}

export default function MantineProvider(props: Props) {
  return (
    <BaseProvider
      theme={theme}
      defaultColorScheme="auto"
      cssVariablesResolver={cssVariablesResolver}
      deduplicateInlineStyles
    >
      <CodeHighlightAdapterProvider adapter={shikiAdapter}>
        <ThemeHotkey />
        <Notifications
          position="bottom-right"
          pauseResetOnHover="notification"
        />
        {props.children}
      </CodeHighlightAdapterProvider>
    </BaseProvider>
  );
}
