import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AdvancedContainer from './AdvancedContainer';
import AdvancedContainerSkeleton from './Skeleton.AdvancedContainer';

const meta: Meta<typeof AdvancedContainer> = {
  title: 'Features/Settings/AdvancedContainer',
  component: AdvancedContainer,
};

export default meta;

type Story = StoryObj<typeof AdvancedContainer>;

export const Default: Story = {};

export const Skeleton: Story = {
  render: () => <AdvancedContainerSkeleton />,
};
