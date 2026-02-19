import { Alert, Container } from '@mantine/core';

export default function MyFeedContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load feed" />
    </Container>
  );
}
