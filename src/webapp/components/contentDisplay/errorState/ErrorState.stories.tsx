import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@mantine/core';
import { IoArrowBack } from 'react-icons/io5';
import ErrorState from './ErrorState';

const meta: Meta<typeof ErrorState> = {
  title: 'Components/ErrorState',
  component: ErrorState,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    message: 'Could not load cards',
  },
};

export default meta;

type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    message: 'Could not load search page',
    action: (
      <Button color="red" leftSection={<IoArrowBack />}>
        Go to search
      </Button>
    ),
  },
};
