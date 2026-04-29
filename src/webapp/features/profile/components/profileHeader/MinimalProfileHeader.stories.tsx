import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MinimalProfileHeader from './MinimalProfileHeader';
import ProfileHeaderSkeleton from './Skeleton.ProfileHeader';

const meta: Meta<typeof MinimalProfileHeader> = {
  title: 'Features/Profile/MinimalProfileHeader',
  component: MinimalProfileHeader,
  args: {
    name: 'Elena Kowalski',
    handle: 'elena.kowalski',
    avatarUrl: 'https://i.pravatar.cc/150?u=elena',
  },
};

export default meta;

type Story = StoryObj<typeof MinimalProfileHeader>;

/** Sticky mini header shown when scrolling past the main profile header. */
export const Default: Story = {};

/** Falls back to the Mantine Avatar placeholder when no avatar URL is provided. */
export const NoAvatar: Story = {
  args: {
    avatarUrl: undefined,
  },
};

/** Long names are clamped to a single line. */
export const LongName: Story = {
  args: {
    name: 'Dr. Alexandria Pemberton-Worthington III',
    handle: 'alexandria.pemberton',
  },
};

/** Full-page profile header skeleton shown during initial load. */
export const Skeleton: Story = {
  render: () => <ProfileHeaderSkeleton />,
};
