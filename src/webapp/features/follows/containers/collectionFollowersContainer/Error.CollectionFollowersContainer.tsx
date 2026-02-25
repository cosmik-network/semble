import { Alert, Container } from '@mantine/core';

export default function CollectionFollowersContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load collection followers" />
    </Container>
  );
}
