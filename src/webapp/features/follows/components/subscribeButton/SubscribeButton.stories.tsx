import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import SubscribeButton, { type SubscriptionPrefs } from './SubscribeButton';

const meta: Meta<typeof SubscribeButton> = {
  title: 'Features/Follows/SubscribeButton',
  component: SubscribeButton,
};

export default meta;

type Story = StoryObj<typeof SubscribeButton>;

// ─── User ────────────────────────────────────────────────────────────────────

/** Following a user but no subscriptions on. Bell is outlined. */
export const UserDefault: Story = {
  args: {
    targetId: 'did:plc:user123',
    targetType: 'USER',
    prefs: { cards: false, connections: false },
  },
};

/** Subscribed to cards only. */
export const UserCardsOnly: Story = {
  args: {
    targetId: 'did:plc:user123',
    targetType: 'USER',
    prefs: { cards: true, connections: false },
  },
};

/** Subscribed to connections only. */
export const UserConnectionsOnly: Story = {
  args: {
    targetId: 'did:plc:user123',
    targetType: 'USER',
    prefs: { cards: false, connections: true },
  },
};

/** Subscribed to everything. Bell is filled. */
export const UserAllOn: Story = {
  args: {
    targetId: 'did:plc:user123',
    targetType: 'USER',
    prefs: { cards: true, connections: true },
  },
};

// ─── Collection ──────────────────────────────────────────────────────────────

/** Following a collection but no subscriptions on. */
export const CollectionDefault: Story = {
  args: {
    targetId: 'col-abc-001',
    targetType: 'COLLECTION',
    prefs: { cards: false, connections: false },
  },
};

/** Subscribed to cards only. */
export const CollectionCardsOnly: Story = {
  args: {
    targetId: 'col-abc-001',
    targetType: 'COLLECTION',
    prefs: { cards: true, connections: false },
  },
};

/** Subscribed to everything. */
export const CollectionAllOn: Story = {
  args: {
    targetId: 'col-abc-001',
    targetType: 'COLLECTION',
    prefs: { cards: true, connections: true },
  },
};

// ─── Interactive ─────────────────────────────────────────────────────────────

/** Click the bell to open the menu and toggle subscriptions. */
export const Interactive: Story = {
  render: () => {
    const [prefs, setPrefs] = useState<SubscriptionPrefs>({
      cards: false,
      connections: false,
    });

    return (
      <SubscribeButton
        targetId="did:plc:user123"
        targetType="USER"
        prefs={prefs}
        onPrefsChange={setPrefs}
      />
    );
  },
};
