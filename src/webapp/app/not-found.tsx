import { Container, Stack, Title, Text } from '@mantine/core';

export default function NotFound() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="xs">
        <Title order={1} fz="h2">
          Not found
        </Title>
        <Text c="gray" ta="center">
          We couldn&apos;t find what you were looking for.
        </Text>
      </Stack>
    </Container>
  );
}
