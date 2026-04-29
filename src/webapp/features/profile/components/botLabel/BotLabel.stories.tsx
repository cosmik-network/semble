import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BotLabel from './BotLabel';

const meta: Meta<typeof BotLabel> = {
  title: 'Features/Profile/BotLabel',
  component: BotLabel,
};

export default meta;

type Story = StoryObj<typeof BotLabel>;

/** Tooltip icon shown on bot accounts. Hover to see the label. */
export const Default: Story = {};
