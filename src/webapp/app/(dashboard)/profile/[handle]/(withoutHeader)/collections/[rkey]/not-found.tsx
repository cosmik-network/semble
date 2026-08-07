import { Container, Stack, Title, Text } from '@mantine/core';

export default function CollectionNotFound() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="xs">
        <Title order={1} fz="h2">
          Collection not found
        </Title>
        <Text fz={'lg'} fw={500} c={'dimmed'} ta={'center'} maw={340}>
          This collection doesn&apos;t exist. The handle may have changed or the
          collection was removed.
        </Text>
      </Stack>
    </Container>
  );
}
