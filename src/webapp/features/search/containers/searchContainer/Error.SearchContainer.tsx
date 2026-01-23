import { Alert, Button, Container } from '@mantine/core';
import Link from 'next/link';
import { BiSolidLeftArrowAlt } from 'react-icons/bi';

export default function SearchContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load search page">
        <Button
          color="red"
          component={Link}
          href={'/search'}
          leftSection={<BiSolidLeftArrowAlt />}
        >
          Go to search
        </Button>
      </Alert>
    </Container>
  );
}
