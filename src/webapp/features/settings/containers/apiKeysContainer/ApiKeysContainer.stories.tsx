import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ApiKeysContainer from './ApiKeysContainer';
import ApiKeysContainerSkeleton from './Skeleton.ApiKeysContainer';

const meta: Meta<typeof ApiKeysContainer> = {
  title: 'Features/Settings/ApiKeysContainer',
  component: ApiKeysContainer,
};

export default meta;

type Story = StoryObj<typeof ApiKeysContainer>;

/** Three mock API keys — the default state. */
export const Default: Story = {};

/** No keys yet — shows the empty state UI. */
export const Empty: Story = {
  args: {
    initialKeys: [],
  },
};

export const Skeleton: Story = {
  render: () => <ApiKeysContainerSkeleton />,
};
