import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutContainer from './AboutContainer';
import AboutContainerSkeleton from './Skeleton.AboutContainer';

const meta: Meta<typeof AboutContainer> = {
  title: 'Features/Settings/AboutContainer',
  component: AboutContainer,
};

export default meta;

type Story = StoryObj<typeof AboutContainer>;

export const Default: Story = {};

export const Skeleton: Story = {
  render: () => <AboutContainerSkeleton />,
};
