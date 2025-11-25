import { Container, Stack, Title } from '@mantine/core';

export default function NotificationsContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack gap="xl">
        <Title order={1}>Notifications</Title>
      </Stack>
    </Container>
  );
}
