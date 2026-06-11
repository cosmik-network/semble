import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SubscribeButton from './SubscribeButton';

const meta: Meta<typeof SubscribeButton> = {
  title: 'Features/Follows/SubscribeButton',
  component: SubscribeButton,
};

export default meta;

type Story = StoryObj<typeof SubscribeButton>;

export const UserNotSubscribed: Story = {
  args: {
    targetId: 'did:plc:user123',
    targetType: 'USER',
    initialIsSubscribed: false,
  },
};

export const UserSubscribed: Story = {
  args: {
    targetId: 'did:plc:user123',
    targetType: 'USER',
    initialIsSubscribed: true,
  },
};

export const CollectionNotSubscribed: Story = {
  args: {
    targetId: 'col-abc-001',
    targetType: 'COLLECTION',
    initialIsSubscribed: false,
  },
};

export const CollectionSubscribed: Story = {
  args: {
    targetId: 'col-abc-001',
    targetType: 'COLLECTION',
    initialIsSubscribed: true,
  },
};
