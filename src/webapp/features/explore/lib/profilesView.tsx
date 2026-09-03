import { Group } from '@mantine/core';
import { HiOutlineSparkles } from 'react-icons/hi';
import { FaBluesky } from 'react-icons/fa6';

export type ProfilesView = 'forYou' | 'bluesky';

interface ProfileViewOption {
  value: ProfilesView;
  label: React.ReactNode;
}

export const profileViewOptions: ProfileViewOption[] = [
  {
    value: 'forYou',
    label: (
      <Group gap={'xxs'} wrap="nowrap" justify="center">
        <HiOutlineSparkles size={16} />
        <span>{'For you'}</span>
      </Group>
    ),
  },
  {
    value: 'bluesky',
    label: (
      <Group gap={'xxs'} wrap="nowrap" justify="center">
        <FaBluesky size={16} />
        <span>{'Followed on Bluesky'}</span>
      </Group>
    ),
  },
];
