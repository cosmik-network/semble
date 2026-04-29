import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AppearanceContainer from './AppearanceContainer';
import AppearanceContainerSkeleton from './Skeleton.AppearanceContainer';

const meta: Meta<typeof AppearanceContainer> = {
  title: 'Features/Settings/AppearanceContainer',
  component: AppearanceContainer,
};

export default meta;

type Story = StoryObj<typeof AppearanceContainer>;

export const Default: Story = {};

export const Skeleton: Story = {
  render: () => <AppearanceContainerSkeleton />,
};
