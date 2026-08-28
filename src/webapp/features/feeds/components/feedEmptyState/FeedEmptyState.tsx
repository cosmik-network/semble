'use client';

import { Button } from '@mantine/core';
import { IconType } from 'react-icons/lib';
import { FaBluesky } from 'react-icons/fa6';
import { HiGlobeAlt, HiUsers } from 'react-icons/hi';
import { MdFilterList } from 'react-icons/md';
import { LinkButton } from '@/components/link/MantineLink';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import {
  FeedEmptyAction,
  FeedEmptyIcon,
  feedEmptyState,
} from '../../lib/feedEmptyState';
import { FeedView } from '../../lib/feedOptions';

const ICONS: Record<FeedEmptyIcon, IconType> = {
  filter: MdFilterList,
  global: HiGlobeAlt,
  following: HiUsers,
  bluesky: FaBluesky,
};

interface Props {
  view: FeedView;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function renderAction(
  action: FeedEmptyAction | undefined,
  onClearFilters: () => void,
) {
  if (action === undefined) return undefined;

  if (action.kind === 'clearFilters') {
    return (
      <Button variant="light" color="gray" onClick={onClearFilters}>
        {action.label}
      </Button>
    );
  }

  return (
    <LinkButton variant="light" color="gray" href={action.href}>
      {action.label}
    </LinkButton>
  );
}

export default function FeedEmptyState(props: Props) {
  const state = feedEmptyState({
    view: props.view,
    hasFilters: props.hasFilters,
  });

  return (
    <EmptyState
      message={state.message}
      icon={ICONS[state.icon]}
      button={renderAction(state.action, props.onClearFilters)}
    />
  );
}
