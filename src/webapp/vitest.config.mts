import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    server: {
      deps: {
        // Mantine and react-icons publish ESM that references browser globals;
        // inlining them ensures Vitest transforms them for the jsdom environment.
        inline: [
          '@mantine/code-highlight',
          '@mantine/core',
          '@mantine/dates',
          '@mantine/dropzone',
          '@mantine/form',
          '@mantine/hooks',
          '@mantine/modals',
          '@mantine/notifications',
          'react-icons',
        ],
      },
    },
  },
});
