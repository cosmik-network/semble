'use client';

import { Group, Progress, Text } from '@mantine/core';

interface Props {
  picked: number;
  goal: number;
}

// A full string per branch rather than one assembled around the number, which
// would not survive translation.
function goalLabel(picked: number, goal: number) {
  if (picked === 0) return `Pick at least ${goal} for the best suggestions`;
  if (picked >= goal) return 'Good to go — pick more if you like';

  return `${picked} of ${goal} picked`;
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
        aria-hidden="true"
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
