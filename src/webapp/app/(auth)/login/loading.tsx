import { Loader, Stack } from '@mantine/core';

export default function Loading() {
  return (
    <Stack align="center">
      <Loader type="dots" />
    </Stack>
  );
}
