'use client';

import { Button, Center, Container, Group, Stack, Text } from '@mantine/core';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error(props: Props) {
  return (
    <Center h={'100svh'} p={'md'}>
      <Container size={'sm'}>
        <Stack align="center" gap={'xs'}>
          <Text fz={'h1'} fw={600} ta={'center'}>
            Unable to load setup
          </Text>
          <Text fz={'lg'} fw={500} c={'dimmed'} ta={'center'} maw={360}>
            Your progress is saved. Try again, or come back to this later.
          </Text>
          <Group justify="center" gap="xs" mt={'lg'}>
            <Button onClick={props.reset}>Try again</Button>
            <LinkButton href="/home" variant="default">
              Go home
            </LinkButton>
          </Group>
        </Stack>
      </Container>
    </Center>
  );
}
