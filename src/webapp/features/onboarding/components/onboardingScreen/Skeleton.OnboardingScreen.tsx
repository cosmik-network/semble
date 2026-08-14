'use client';

import {
  Box,
  Center,
  Container,
  Group,
  Loader,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import OnboardingHeaderSkeleton from '../onboardingHeader/Skeleton.OnboardingHeader';
import OnboardingScreen, { CONTENT_SIZE } from './OnboardingScreen';

interface Props {
  /** The returning view carries neither a stepper nor a footer. */
  variant?: 'stage' | 'returning';
}

export default function OnboardingScreenSkeleton(props: Props) {
  const isStage = props.variant !== 'returning';

  return (
    <OnboardingScreen
      header={<OnboardingHeaderSkeleton withStepper={isStage} />}
      footer={
        isStage && (
          <Box
            component="footer"
            style={{
              borderTop:
                '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))',
              backgroundColor: 'var(--mantine-color-body)',
            }}
          >
            <Container size={CONTENT_SIZE} py={'sm'}>
              <Group justify="space-between" gap={'sm'} wrap="nowrap">
                <Skeleton h={36} w={96} radius={'xl'} />

                <Group gap={'xs'} wrap="nowrap">
                  <Skeleton h={36} w={64} radius={'xl'} />
                  <Skeleton h={36} w={124} radius={'xl'} />
                </Group>
              </Group>
            </Container>
          </Box>
        )
      }
    >
      <Center h={'100%'}>
        <Stack align="center" gap={'xs'}>
          <Loader />
          <Text c={'dimmed'}>Getting things ready…</Text>
        </Stack>
      </Center>
    </OnboardingScreen>
  );
}
