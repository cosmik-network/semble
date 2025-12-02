import { Container, Stack, Title, Text } from '@mantine/core';

export default function NotificationsContainer() {
  const count = 0;

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Title order={1}>Notifications</Title>

        {count === 0 ? (
          <Stack align="center" gap="xs">
            <Text fz="h3" fw={600} c="gray">
              No notifications right now — but we're on the lookout!
            </Text>
          </Stack>
        ) : (
          <></>
        )}
      </Stack>
    </Container>
  );
}
