import { Box, Group, Scroller, Stack, Title, Text } from '@mantine/core';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { LinkButton } from '@/components/link/MantineLink';

export default function DiscoverOnSembleSkeleton() {
  return (
    <Stack>
      <Group justify="space-between">
        <Stack gap={0}>
          <Group gap="xs">
            <MdOutlineEmojiNature size={22} />
            <Title order={2}>Discover on Semble</Title>
          </Group>
          <Text fw={500} fz={'lg'}>
            Recommendations based on your activity
          </Text>
        </Stack>
        <LinkButton variant="light" color="blue" href={'/explore'}>
          Explore
        </LinkButton>
      </Group>

      <Scroller scrollAmount={320}>
        <Group wrap="nowrap" align="stretch" gap="xs">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} w={300} style={{ flexShrink: 0 }}>
              <UrlCardSkeleton />
            </Box>
          ))}
        </Group>
      </Scroller>
    </Stack>
  );
}
