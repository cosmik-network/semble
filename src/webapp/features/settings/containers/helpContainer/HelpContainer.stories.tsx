import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpContainer from './HelpContainer';
import HelpContainerSkeleton from './Skeleton.HelpContainer';

const meta = {
  title: 'Features/Settings/HelpContainer',
  component: HelpContainer,
} satisfies Meta<typeof HelpContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Skeleton: Story = {
  render: () => <HelpContainerSkeleton />,
};
