import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true
  },
  test: {
    projects: [{
      extends: true,
      test: {
        environment: 'jsdom',
        include: ['**/*.{test,spec}.{ts,tsx}'],
        server: {
          deps: {
            // Mantine and react-icons publish ESM that references browser globals;
            // inlining them ensures Vitest transforms them for the jsdom environment.
            inline: ['@mantine/code-highlight', '@mantine/core', '@mantine/dates', '@mantine/dropzone', '@mantine/form', '@mantine/hooks', '@mantine/modals', '@mantine/notifications', 'react-icons']
          }
        }
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});