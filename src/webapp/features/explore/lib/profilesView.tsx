import { Group } from '@mantine/core';
import { HiOutlineSparkles } from 'react-icons/hi';
import { FaBluesky } from 'react-icons/fa6';

export type ProfilesView = 'forYou' | 'bluesky';

export interface ProfileViewOption {
  value: ProfilesView;
  label: React.ReactNode;
}

function withIcon(icon: React.ReactNode, label: string) {
  return (
    <Group gap={7} wrap="nowrap" justify="center">
      {icon}
      <span>{label}</span>
    </Group>
  );
}

/** Shared by the explore shelf and the standalone profiles page so the two
 * segmented controls can't drift apart. */
export const profileViewOptions: ProfileViewOption[] = [
  {
    value: 'forYou',
    label: withIcon(<HiOutlineSparkles size={16} />, 'For you'),
  },
  {
    value: 'bluesky',
    label: withIcon(<FaBluesky size={15} />, 'Followed on Bluesky'),
  },
];
