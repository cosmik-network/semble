'use client';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';
import { theme } from '@/styles/theme';
import { MantineProvider as BaseProvider } from '@mantine/core';
import {
  CodeHighlightAdapterProvider,
  createShikiAdapter,
} from '@mantine/code-highlight';

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

export default function MantineProvider(props: Props) {
  return (
    <BaseProvider theme={theme} defaultColorScheme="auto">
      <CodeHighlightAdapterProvider adapter={shikiAdapter}>
        <Notifications position="bottom-right" />
        {props.children}
      </CodeHighlightAdapterProvider>
    </BaseProvider>
  );
}
