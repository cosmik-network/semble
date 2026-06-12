import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SubscribeModal from './SubscribeModal';

const meta: Meta<typeof SubscribeModal> = {
  title: 'Features/Follows/SubscribeModal',
  component: SubscribeModal,
  args: {
    opened: true,
    onClose: () => {
      // eslint-disable-next-line no-console
      console.log('[mock] modal closed');
    },
    onConfirm: (scopes) => {
      // eslint-disable-next-line no-console
      console.log('[mock] confirmed scopes', scopes);
    },
  },
};

export default meta;

type Story = StoryObj<typeof SubscribeModal>;

export const UserNotSubscribed: Story = {
  args: {
    targetType: 'USER',
    isSubscribed: false,
    currentScopes: [],
  },
};

export const UserSubscribed: Story = {
  args: {
    targetType: 'USER',
    isSubscribed: true,
    currentScopes: ['CARD', 'CONNECTION'],
  },
};

export const CollectionSubscribedPartial: Story = {
  args: {
    targetType: 'COLLECTION',
    isSubscribed: true,
    currentScopes: ['CARD'],
  },
};
