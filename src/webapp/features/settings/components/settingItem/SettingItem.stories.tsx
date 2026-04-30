import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ButtonGroup } from '@mantine/core';
import {
  IoMdColorPalette,
  IoMdHelpCircle,
  IoMdInformationCircle,
} from 'react-icons/io';
import SettingItem from './SettingItem';
import SettingItemSkeleton from './Skeleton.SettingItem';

const meta: Meta<typeof SettingItem> = {
  title: 'Features/Settings/SettingItem',
  component: SettingItem,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    href: '/settings/appearance',
    icon: IoMdColorPalette,
    children: 'Appearance',
    openInNewTab: false,
  },
};

export default meta;

type Story = StoryObj<typeof SettingItem>;

export const Default: Story = {};

export const OpenInNewTab: Story = {
  args: {
    href: 'https://help.example.com',
    icon: IoMdHelpCircle,
    children: 'Help & Support',
    openInNewTab: true,
  },
};

export const Group: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <SettingItem href="/settings/appearance" icon={IoMdColorPalette}>
        Appearance
      </SettingItem>
      <SettingItem href="/settings/help" icon={IoMdHelpCircle}>
        Help & Support
      </SettingItem>
      <SettingItem
        href="/settings/about"
        icon={IoMdInformationCircle}
        openInNewTab
      >
        About
      </SettingItem>
    </ButtonGroup>
  ),
};

export const Skeleton: Story = {
  render: () => <SettingItemSkeleton />,
};
