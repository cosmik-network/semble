'use client';

import { ActionIcon, Menu } from '@mantine/core';
import { MdNotificationAdd, MdNotificationsActive } from 'react-icons/md';
import { IoMdCheckmark } from 'react-icons/io';

export interface SubscriptionPrefs {
  cards: boolean;
  connections: boolean;
}

interface Props {
  targetId: string;
  targetType: 'COLLECTION' | 'USER';
  prefs?: SubscriptionPrefs;
  onPrefsChange?: (next: SubscriptionPrefs) => void;
}

const OPTIONS: { key: keyof SubscriptionPrefs; label: string }[] = [
  { key: 'cards', label: 'Cards' },
  { key: 'connections', label: 'Connections' },
];

const DEFAULT_PREFS: SubscriptionPrefs = { cards: false, connections: false };

export default function SubscribeButton({ prefs, onPrefsChange }: Props) {
  const resolved = prefs ?? DEFAULT_PREFS;
  const isActive = resolved.cards || resolved.connections;

  function toggle(key: keyof SubscriptionPrefs) {
    onPrefsChange?.({ ...resolved, [key]: !resolved[key] });
  }

  return (
    <Menu shadow="sm" position="bottom-end" closeOnItemClick={false}>
      <Menu.Target>
        <ActionIcon
          variant={isActive ? 'light' : 'filled'}
          color={isActive ? 'gray' : 'dark'}
          radius="xl"
          aria-label="Subscribe"
        >
          {isActive ? (
            <MdNotificationsActive size={16} />
          ) : (
            <MdNotificationAdd size={16} />
          )}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Notify me about</Menu.Label>
        {OPTIONS.map((opt) => (
          <Menu.Item
            key={opt.key}
            rightSection={resolved[opt.key] ? <IoMdCheckmark /> : null}
            onClick={() => toggle(opt.key)}
          >
            {opt.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
