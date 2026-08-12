'use client';

import { Suspense } from 'react';
import type { UrlView } from '@/api-client';
import { Card } from '@mantine/core';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import UrlCardContentSkeleton from '@/features/cards/components/urlCardContent/Skeleton.UrlCardContent';
import { TOPIC_COLOR } from '../topicTile/topicVisuals';
import tileStyles from '../topicTile/TopicTile.module.css';

interface Props {
  urlView: UrlView;
  selected: boolean;
  onToggle: (url: string) => void;
}

/**
 * The app's own `UrlCardContent` with `UrlCard`'s actions deliberately absent:
 * this stage saves nothing, and `staticDomain` keeps the domain out of the tab
 * order so a click meant as "yes, this one" cannot navigate away.
 *
 * `UrlView.metadata` and `UrlCard['cardContent']` are the same shape, so the
 * recommendation feeds the shared component with no mapping.
 */
export default function OnboardingUrlCard(props: Props) {
  const toggle = () => props.onToggle(props.urlView.url);

  return (
    // Not `component="button"`: UrlCardContent renders anchors of its own, and
    // interactive content nested inside a <button> is invalid markup.
    <Card
      withBorder
      radius={'lg'}
      p={'sm'}
      h={'100%'}
      className={tileStyles.tile}
      role="button"
      tabIndex={0}
      aria-pressed={props.selected}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggle();
      }}
      style={{
        // A shadow rather than a thicker border: shadows take no layout space,
        // so the card cannot change size on click.
        borderColor: props.selected
          ? `var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
        boxShadow: props.selected
          ? `0 0 0 1px var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
        // The whole card is the toggle. Mantine has no prop for this.
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* UrlCardContent suspends for Semble collection and profile URLs, and
          without this the whole stage goes behind the page-level fallback. */}
      <Suspense fallback={<UrlCardContentSkeleton />}>
        <UrlCardContent
          url={props.urlView.url}
          cardContent={props.urlView.metadata}
          staticDomain
        />
      </Suspense>
    </Card>
  );
}
