'use client';

import type { ReactNode } from 'react';
import { Stack, Text, Title } from '@mantine/core';

const DESCRIPTION_MEASURE = 480;

interface Props {
  title: ReactNode;
  description: ReactNode;
}

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
