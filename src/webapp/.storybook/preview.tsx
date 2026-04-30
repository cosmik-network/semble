import type { Preview } from '@storybook/nextjs-vite';
import '@mantine/core/styles.css';
import { MantineProvider, v8CssVariablesResolver } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../styles/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

// Mantine's default body background colors
const MANTINE_LIGHT_BG = '#ffffff';
const MANTINE_DARK_BG = '#1A1B1E';

const preview: Preview = {
  globalTypes: {
    colorScheme: {
      description: 'Mantine color scheme',
      toolbar: {
        title: 'Color Scheme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    colorScheme: 'light',
    backgrounds: { value: MANTINE_LIGHT_BG },
  },

  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        light: { name: 'Light', value: MANTINE_LIGHT_BG },
        dark: { name: 'Dark', value: MANTINE_DARK_BG },
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },

  decorators: [
    (Story, context) => {
      const colorScheme =
        (context.globals.colorScheme as 'light' | 'dark') ?? 'light';
      return (
        <QueryClientProvider client={queryClient}>
          <MantineProvider
            theme={theme}
            cssVariablesResolver={v8CssVariablesResolver}
            forceColorScheme={colorScheme}
          >
            <Story />
          </MantineProvider>
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;
