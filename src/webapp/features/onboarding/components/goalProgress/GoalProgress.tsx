'use client';

import { Group, Progress, Text } from '@mantine/core';
import { goalLabel } from '../../lib/goalLabel';

interface Props {
  picked: number;
  goal: number;
}

export default function GoalProgress(props: Props) {
  const reached = props.picked >= props.goal;

  return (
    <Group gap={'sm'} wrap="nowrap">
      <Progress
        value={(Math.min(props.picked, props.goal) / props.goal) * 100}
        w={72}
        size="sm"
        radius={'xl'}
        color="tangerine"
        transitionDuration={200}
      />

      <Text
        fz={'sm'}
        fw={reached ? 600 : 500}
        c={reached ? 'bright' : 'dimmed'}
      >
        {goalLabel(props.picked, props.goal)}
      </Text>
    </Group>
  );
}
