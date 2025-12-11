import { Alert, Container } from '@mantine/core';

export default function NotificationsContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load notifications" />
    </Container>
  );
}
