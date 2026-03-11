'use client';

import { SegmentedControl } from '@mantine/core';

type Direction = 'outgoing' | 'incoming';

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
      radius={'xl'}
      withItemsBorders={false}
      value={props.value}
      onChange={handleChange}
      data={[
        { label: 'All', value: 'all' },
        { label: 'To', value: 'outgoing' },
        { label: 'From', value: 'incoming' },
      ]}
    />
  );
}
