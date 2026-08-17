import { Button, Stack, Text } from '@mantine/core';
import type { FallbackProps } from 'react-error-boundary';

export default function OnboardingStepError({
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <Stack align="center" gap="xs" py="xl">
      <Text fz={'h1'} fw={600} ta={'center'}>
        Unable to load setup
      </Text>
      <Text fz={'lg'} fw={500} c={'dimmed'} ta={'center'} maw={360}>
        Your progress is saved. Try again, or come back to this later.
      </Text>
      <Button onClick={resetErrorBoundary} mt="xs">
        Try again
      </Button>
    </Stack>
  );
}
