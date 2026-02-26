'use client';

import { Center, Stack, Title, Text, Card } from '@mantine/core';

export default function ExtensionAuthSuccessPage() {
  return (
    <Center h={'100svh'}>
      <Card withBorder w={400}>
        <Stack align="center" gap="md">
          <Title order={2} ta="center">
            Extension Authentication Successful
          </Title>
          <Text ta="center" c="dimmed">
            You can close this tab and start using the extension.
          </Text>
        </Stack>
      </Card>
    </Center>
  );
}
