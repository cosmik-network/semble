'use client';

import { Stack } from '@mantine/core';
import { MouseEvent, ReactNode } from 'react';
import {
  describeItemClick,
  findClickedItem,
} from '@/features/analytics/pageVisit';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import { EXPLORE_SECTIONS, ExploreSection } from '../../lib/exploreSections';
import { ProfilesView } from '../../lib/profilesView';
import {
  ExploreAction,
  trackExploreAction,
  trackExploreItemClicked,
} from '../../lib/analytics';

interface Props {
  section: ExploreSection;
  subtitle?: string;
  actions?: ReactNode;
  /** Which profiles list is showing, sent with clicks on the profiles shelf. */
  profilesView?: ProfilesView;
  children: ReactNode;
}

/** A titled explore section. The shelf and its skeleton both render through
 * this, so the header is written once per section. */
export default function ExploreShelf(props: Props) {
  const section = EXPLORE_SECTIONS[props.section];

  // Header controls opt in with `data-analytics-action`; everything else is
  // classified as an item in the shelf
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const action = target.closest<HTMLElement>('[data-analytics-action]');
    if (action && e.currentTarget.contains(action)) {
      trackExploreAction(
        props.section,
        action.dataset.analyticsAction as ExploreAction,
      );
      return;
    }

    const item = findClickedItem(e.currentTarget, target);
    if (!item) return;

    const click = describeItemClick(item);
    if (click) {
      trackExploreItemClicked(props.section, {
        ...click,
        profiles_view: props.profilesView,
      });
    }
  };

  return (
    <Stack onClickCapture={handleClick}>
      <ExploreSectionHeader
        icon={section.icon}
        title={section.title}
        subtitle={props.subtitle ?? section.subtitle}
        viewAllHref={section.viewAllHref}
        actions={props.actions}
      />
      {props.children}
    </Stack>
  );
}
