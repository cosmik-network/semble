'use client';

import type { ReactNode } from 'react';
import { Container, Stack } from '@mantine/core';

interface Props {
  header: ReactNode;
  /** Omitted on the returning view — there is no Back/Continue outside the flow. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The full-height header/scrollable-body/optional-footer shell shared by the
 * flow and the returning view. Pulled out so the two screens can't drift on
 * padding or overflow behavior independently — they're the same shell with
 * different content.
 */
export default function OnboardingScreen(props: Props) {
  return (
    <Stack h={'100svh'} gap={0}>
      {props.header}

      <Container
        size={'md'}
        flex={1}
        w={'100%'}
        py={'xl'}
        px={'md'}
        style={{ overflowY: 'auto' }}
      >
        {props.children}
      </Container>

      {props.footer}
    </Stack>
  );
}
