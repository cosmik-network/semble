import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { BiCollection } from 'react-icons/bi';
import { MdPersonSearch } from 'react-icons/md';
import ProfileEmptyTab from './ProfileEmptyTab';

const meta: Meta<typeof ProfileEmptyTab> = {
  title: 'Features/Profile/ProfileEmptyTab',
  component: ProfileEmptyTab,
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

type Story = StoryObj<typeof ProfileEmptyTab>;

/** Empty state for a tab with no content. */
export const Default: Story = {};

/** Empty state with an action button to prompt the user. */
export const WithButton: Story = {
  args: {
    message: 'No cards yet',
    icon: FaRegNoteSticky,
    button: <Button variant="light">Add your first card</Button>,
  },
};

/** Empty collections tab. */
export const Collections: Story = {
  args: {
    message: 'No collections yet',
    icon: BiCollection,
  },
};

/** Empty connections tab with a call-to-action. */
export const Connections: Story = {
  args: {
    message: 'No connections yet',
    icon: MdPersonSearch,
    button: <Button variant="light">Find people to connect with</Button>,
  },
};
