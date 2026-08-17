'use client';

import type { UrlView } from '@/api-client';
import { Card } from '@mantine/core';
import OnboardingUrlCardContent from './OnboardingUrlCardContent';
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
      <OnboardingUrlCardContent urlView={props.urlView} />
    </Card>
  );
}
