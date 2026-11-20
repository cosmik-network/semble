'use client';

import { SegmentedControl } from '@mantine/core';
import type { UserSettings } from '@/features/settings/lib/queries/useUserSettings';

type ThreadViewMode = UserSettings['threadView'];

interface Props {
  view: ThreadViewMode;
  onViewChange: (view: ThreadViewMode) => void;
}

export default function ThreadViewControls(props: Props) {
  return (
    <SegmentedControl
      size="xs"
      radius="xl"
      aria-label="Thread layout"
      value={props.view}
      onChange={(value) => props.onViewChange(value as ThreadViewMode)}
      data={[
        { value: 'tree', label: 'Tree' },
        { value: 'list', label: 'List' },
      ]}
    />
  );
}
