'use client';

import type { ReactNode } from 'react';
import { Stack, Text, Title } from '@mantine/core';

/** The stage container runs to 720px and wider, which is too long to read. */
const DESCRIPTION_MEASURE = 480;

interface Props {
  title: ReactNode;
  description: ReactNode;
}

/** The h1 and standfirst every stage opens with. */
export default function StepHeading(props: Props) {
  return (
    <Stack gap={4}>
      <Title order={1}>{props.title}</Title>
      <Text fw={500} c={'gray'} maw={DESCRIPTION_MEASURE}>
        {props.description}
      </Text>
    </Stack>
  );
}
