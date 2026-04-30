import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FeedSettingsContainer from './FeedSettingsContainer';

const meta: Meta<typeof FeedSettingsContainer> = {
  title: 'Features/Settings/FeedSettingsContainer',
  component: FeedSettingsContainer,
};

export default meta;

type Story = StoryObj<typeof FeedSettingsContainer>;

export const Default: Story = {};
