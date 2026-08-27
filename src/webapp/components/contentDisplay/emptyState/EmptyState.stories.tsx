import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { BiCollection, BiSearch } from 'react-icons/bi';
import { MdPersonSearch } from 'react-icons/md';
import EmptyState from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    message: 'No cards yet',
    icon: FaRegNoteSticky,
  },
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithoutIcon: Story = {
  args: {
    message: 'No collections',
    icon: undefined,
  },
};

export const WithButton: Story = {
  args: {
    message: 'No cards yet',
    icon: FaRegNoteSticky,
    button: <Button variant="light">Add your first card</Button>,
  },
};

export const WithDescription: Story = {
  args: {
    message: 'No cards found',
    icon: BiSearch,
    description: 'Try a different search term',
  },
};

export const Collections: Story = {
  args: {
    message: 'No collections yet',
    icon: BiCollection,
  },
};

export const Connections: Story = {
  args: {
    message: 'No connections yet',
    icon: MdPersonSearch,
    button: <Button variant="light">Find people to connect with</Button>,
  },
};
