import { Container, Group, Skeleton, Stack, Text } from '@mantine/core';

/**
 * Route-level fallback, also used as page.tsx's Suspense fallback. It renders
 * the same header bar and body frame as OnboardingScreen so a suspension
 * inside the flow swaps the content out rather than blanking the whole screen.
 *
 * Deliberately no client state — no stored step, no status — so it can never
 * disagree with whatever renders after it resolves.
 */
export default function Loading() {
  return (
    <Stack h={'100svh'} gap={0}>
      <Group
        component="header"
        px={'md'}
        py={'sm'}
        gap={'md'}
        wrap="nowrap"
        align="center"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Text fw={700} fz={'lg'} style={{ flex: '0 0 auto' }}>
          Semble
        </Text>
        <Skeleton height={18} width={260} radius={'xl'} visibleFrom="sm" />
        <Skeleton height={26} width={88} radius={'xl'} ml={'auto'} />
      </Group>

      <Container size={'md'} flex={1} w={'100%'} py={'xl'} px={'md'}>
        <Stack gap={'md'}>
          <Skeleton height={30} width={'55%'} radius={'sm'} />
          <Skeleton height={16} width={'35%'} radius={'sm'} />
          <Skeleton height={200} radius={'lg'} mt={'md'} />
        </Stack>
      </Container>
    </Stack>
  );
}
