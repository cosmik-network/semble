import { Alert, Container } from '@mantine/core';

export default function FollowingContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load followings" />
    </Container>
  );
}
