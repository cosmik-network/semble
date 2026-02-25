import { Alert, Container } from '@mantine/core';

export default function CollectionContributorsContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load collection contributors" />
    </Container>
  );
}
