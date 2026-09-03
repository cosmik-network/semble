'use client';

import { Container } from '@mantine/core';
import { IoArrowBack } from 'react-icons/io5';
import { LinkButton } from '@/components/link/MantineLink';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';

export default function Error() {
  return (
    <Container p="xs" size="xl">
      <ErrorState
        message="Could not load search page"
        action={
          <LinkButton
            color="red"
            href={'/search'}
            leftSection={<IoArrowBack />}
          >
            Go to search
          </LinkButton>
        }
      />
    </Container>
  );
}
