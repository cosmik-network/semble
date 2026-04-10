import { Alert, Container } from '@mantine/core';
import { IoArrowBack } from 'react-icons/io5';
import { LinkButton } from '@/components/link/MantineLink';

export default function SearchContainerError() {
  return (
    <Container p="xs" size="xl">
      <Alert color="red" title="Could not load search page">
        <LinkButton color="red" href={'/search'} leftSection={<IoArrowBack />}>
          Go to search
        </LinkButton>
      </Alert>
    </Container>
  );
}
