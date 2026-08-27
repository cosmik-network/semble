import { Stack, Text } from '@mantine/core';

export default function ExploreShelfEmpty(props: { message: string }) {
  return (
    <Stack align="center" gap="xs">
      <Text fz="h3" fw={600} c="gray">
        {props.message}
      </Text>
    </Stack>
  );
}
