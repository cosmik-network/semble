import { Stack, Text } from '@mantine/core';

export default function SembleConnectionsContainerError() {
  return (
    <Stack align="center" justify="center" py={'xl'}>
      <Text c={'red'} fw={600}>
        Failed to load connections
      </Text>
    </Stack>
  );
}
