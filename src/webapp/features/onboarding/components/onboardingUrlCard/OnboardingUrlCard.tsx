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
        borderColor: props.selected
          ? `var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
        boxShadow: props.selected
          ? `0 0 0 1px var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* UrlCardContent suspends for Semble collection and profile URLs, which
          without this would drop the whole stage behind the route fallback. */}
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
