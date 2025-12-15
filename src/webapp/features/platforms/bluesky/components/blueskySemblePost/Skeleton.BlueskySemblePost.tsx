import { Stack, Skeleton, Card, Group, Box } from '@mantine/core';

export default function BlueskySemblePostSkeleton() {
  return (
    <Stack gap="md" mx="auto" w={'100%'}>
      {/* Domain */}
      <Skeleton w={100} h={20} />

      {/* Post */}
      <Card radius={'lg'} withBorder>
        <Stack gap="xs" w={'100%'}>
          {/* Author row */}
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Skeleton circle h={40} w={40} />

              <Stack gap={6} flex={1}>
                <Skeleton w={130} h={16} />
                <Skeleton w={90} h={14} />
              </Stack>
            </Group>

            {/* Bluesky icon placeholder */}
            <Skeleton h={18} w={18} radius="xl" />
          </Group>

          {/* Post text + embed */}
          <Stack gap="xs" w="100%">
            <Box>
              <Stack gap={6}>
                <Skeleton w="90%" h={14} />
                <Skeleton w="85%" h={14} />
                <Skeleton w="95%" h={14} />
              </Stack>
            </Box>

            {/* Embed placeholder */}
            <Skeleton w="100%" h={180} radius="md" />
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
