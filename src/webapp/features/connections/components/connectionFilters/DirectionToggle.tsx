'use client';

import { SegmentedControl } from '@mantine/core';

type Direction = 'to' | 'from' | 'all';

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
      radius={'xl'}
      withItemsBorders={false}
      data={[
        { label: 'All', value: 'all' },
        { label: 'To', value: 'to' },
        { label: 'From', value: 'from' },
      ]}
    />
  );
}
