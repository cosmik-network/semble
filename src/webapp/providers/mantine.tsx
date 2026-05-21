'use client';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine-bites/lightbox/styles.css';
import { theme } from '@/styles/theme';
import {
  MantineProvider as BaseProvider,
  useMantineColorScheme,
  v8CssVariablesResolver,
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
      cssVariablesResolver={v8CssVariablesResolver}
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
