import '@mantine/core/styles.css';
import '@mantine/code-highlight/styles.css';

import React from 'react';
import { MantineProvider } from '@mantine/core';
import { theme } from '../styles/theme';
import { Hanken_Grotesk } from 'next/font/google';

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
});

export const parameters = {
  layout: 'fullscreen',
  options: {
    showPanel: false,
  },
};

function ColorSchemeWrapper({ children }: { children: React.ReactNode }) {
  return children;
}

export const decorators = [
  (renderStory: any) => (
    <ColorSchemeWrapper>{renderStory()}</ColorSchemeWrapper>
  ),
  (renderStory: any) => (
    <MantineProvider theme={theme}>
      <main className={`${hankenGrotesk.className}`}>{renderStory()}</main>
    </MantineProvider>
  ),
];
