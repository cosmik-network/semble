import { Alert, Container } from '@mantine/core';

export default function FollowersContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load followers" />
    </Container>
  );
}
