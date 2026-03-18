import { Text, Stack, Button, Anchor } from '@mantine/core';
import { FaBluesky } from 'react-icons/fa6';

export default function SignUpForm() {
  return (
    <Stack gap="xs" align="center">
      <Button
        component="a"
        href="https://bsky.app/"
        target="_blank"
        size="lg"
        color="var(--mantine-color-dark-filled)"
        leftSection={<FaBluesky size={22} />}
      >
        Sign up on Bluesky
      </Button>
      <Text fw={500} fz={'sm'} c={'gray'}>
        Already have a Bluesky account?{' '}
        <Anchor href="/login" fw={500} fz={'sm'} c={'blue'}>
          Log in
        </Anchor>
      </Text>
    </Stack>
  );
}
