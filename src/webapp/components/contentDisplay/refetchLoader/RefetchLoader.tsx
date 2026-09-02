'use client';

import { Collapse, Loader, Stack, Text } from '@mantine/core';
import useLinger from '@/hooks/useLinger';

// Held open for as long as the collapse takes to play, so a refetch that
// returns immediately still opens and closes rather than flickering.
const TRANSITION_MS = 400;

interface Props {
  isRefetching: boolean;
  /** Reads as "Fetching the latest {subject}...". */
  subject: string;
}

export default function RefetchLoader(props: Props) {
  const expanded = useLinger(props.isRefetching, TRANSITION_MS);

  return (
    <Collapse expanded={expanded} transitionDuration={TRANSITION_MS}>
      <Stack align="center" gap={'xs'}>
        <Loader size={'sm'} color={'gray'} />
        <Text fw={600} c={'gray'} mb={'sm'}>
          Fetching the latest {props.subject}...
        </Text>
      </Stack>
    </Collapse>
  );
}
