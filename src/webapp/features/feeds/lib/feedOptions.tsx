import { Image } from '@mantine/core';
import { ActivitySource, ActivityType } from '@semble/types';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { BiLink } from 'react-icons/bi';
import { ReactNode } from 'react';
import MarginLogo from '@/components/MarginLogo';
import SembleLogo from '@/assets/semble-logo.svg';

export type FeedView = 'global' | 'following' | 'bskyFollowing';

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
    icon: <Image src={SembleLogo.src} alt="Semble logo" w={16} h={'auto'} />,
  },
  { value: ActivitySource.MARGIN, label: 'Margin', icon: <MarginLogo /> },
];

/*
 * The one label table for the three views. "Bluesky" on its own read as a
 * *source* — it sits a menu section above Semble/Margin — when the view is
 * about whose activity you see, not where it came from.
 *
 * Typed as a full `Record`, so a fourth view fails to compile until it is
 * named here, and read everywhere else through `feedViewLabel`: the explore
 * feed cards used to keep a second table of the same three strings, which is
 * how "Bluesky" and "Bluesky following" ended up meaning the same thing.
 */
const feedViewLabels: Record<FeedView, string> = {
  global: 'Global',
  following: 'Following',
  bskyFollowing: 'Bluesky following',
};

export function feedViewLabel(view: FeedView): string {
  return feedViewLabels[view];
}

/*
 * Which views the API will only answer for a signed-in reader. A `Record`
 * again, so a fourth view has to say which side it falls on. A guest is no
 * longer kept out of these views — the menu offers them and the explore cards
 * navigate to them — but the request behind one can only 401, so this is what
 * tells `MyFeedContainer` to render the login CTA in place of the feed rather
 * than fire it.
 */
const feedViewAuthRequirement = {
  global: false,
  following: true,
  bskyFollowing: true,
} as const satisfies Record<FeedView, boolean>;

/**
 * The views a guest can open but not read. Derived from the table above so the
 * two cannot disagree — a view flipped to `true` there lands here, and the CTA
 * copy keyed by this type stops compiling until it is written.
 */
export type AuthFeedView = {
  [V in FeedView]: (typeof feedViewAuthRequirement)[V] extends true ? V : never;
}[FeedView];

export function feedViewRequiresAuth(view: FeedView): view is AuthFeedView {
  return feedViewAuthRequirement[view];
}

export const feedOptions: FeedOption[] = [
  { value: 'global', label: feedViewLabels.global },
  { value: 'following', label: feedViewLabels.following },
  { value: 'bskyFollowing', label: feedViewLabels.bskyFollowing },
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
