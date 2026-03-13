'use client';

import { SegmentedControl } from '@mantine/core';

type Direction = 'outgoing' | 'incoming' | 'all';

interface Props {
  value: Direction;
  onChange: (direction: Direction) => void;
}

export default function DirectionToggle(props: Props) {
  const handleChange = (value: string) => {
    props.onChange(value as Direction);
  };

  return (
    <SegmentedControl
      value={props.value}
      onChange={handleChange}
      data={[
        { label: 'All', value: 'all' },
        { label: 'Outgoing', value: 'outgoing' },
        { label: 'Incoming', value: 'incoming' },
      ]}
      radius={'xl'}
      withItemsBorders={false}
    />
  );
}
