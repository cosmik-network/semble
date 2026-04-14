import { Alert, Container } from '@mantine/core';

export default function ConnectionsContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load connections" />
    </Container>
  );
}
