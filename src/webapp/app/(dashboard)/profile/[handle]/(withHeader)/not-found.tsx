import { Container, Stack, Title, Text } from '@mantine/core';

export default function ProfileNotFound() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="xs">
        <Title order={1} fz="h2">
          Profile not found
        </Title>
        <Text fz={'lg'} fw={500} c={'dimmed'} ta={'center'} maw={300}>
          We couldn&apos;t find a profile for that handle. It may have been
          changed or the account no longer exists.
        </Text>
      </Stack>
    </Container>
  );
}
