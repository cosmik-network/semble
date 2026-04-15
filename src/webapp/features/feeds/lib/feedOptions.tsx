import { Image } from '@mantine/core';
import { ActivitySource, ActivityType } from '@semble/types';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { BiLink } from 'react-icons/bi';
import { ReactNode } from 'react';
import MarginLogo from '@/components/MarginLogo';
import SembleLogo from '@/assets/semble-logo.svg';

export type FeedView = 'global' | 'following';

export interface SourceOption {
  value: ActivitySource | null;
  label: string;
  icon: ReactNode | null;
}

export interface FeedOption {
  value: FeedView;
  label: string;
}

export interface ActivityTypeOption {
  value: ActivityType;
  label: string;
  icon: ReactNode;
}

export interface BotFilterOption {
  value: boolean;
  label: string;
}

export const sourceOptions: SourceOption[] = [
  { value: null, label: 'All', icon: null },
  {
    value: ActivitySource.SEMBLE,
    label: 'Semble',
    icon: (
      <Image src={SembleLogo.src} alt="Semble logo" w={16} h={'auto'} />
    ),
  },
  { value: ActivitySource.MARGIN, label: 'Margin', icon: <MarginLogo /> },
];

export const feedOptions: FeedOption[] = [
  { value: 'global', label: 'Global' },
  { value: 'following', label: 'Following' },
];

export const activityTypeOptions: ActivityTypeOption[] = [
  {
    value: ActivityType.CARD_COLLECTED,
    label: 'Card saves',
    icon: <FaRegNoteSticky />,
  },
  {
    value: ActivityType.CONNECTION_CREATED,
    label: 'Connections',
    icon: <BiLink />,
  },
];

export const botFilterOptions: BotFilterOption[] = [
  { value: false, label: 'Hide bots' },
  { value: true, label: 'Include bots' },
];

export const activityTypeToParam = (type: ActivityType): string =>
  type.toLowerCase();

export const paramToActivityType = (param: string): ActivityType | undefined =>
  Object.values(ActivityType).find((t) => t.toLowerCase() === param);
