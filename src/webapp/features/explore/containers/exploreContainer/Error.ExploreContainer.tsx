import { Alert, Container } from '@mantine/core';

export default function ExploreContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load explore" />
    </Container>
  );
}
