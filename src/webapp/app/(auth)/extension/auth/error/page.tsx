'use client';

import { Center, Stack, Title, Text, Card, Anchor } from '@mantine/core';

export default function ExtensionAuthErrorPage() {
  return (
    <Center h={'100svh'}>
      <Card withBorder w={400}>
        <Stack align="center" gap="md">
          <Title order={2} ta="center">
            Unable to authenticate extension
          </Title>
          <Text ta="center" c="dimmed">
            Please re-open the extension and sign in with an{' '}
            <Anchor
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noopener noreferrer"
            >
              app password
            </Anchor>
            .
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
