import { Alert, Container } from '@mantine/core';

export default function SearchContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load search page" />
    </Container>
  );
}
