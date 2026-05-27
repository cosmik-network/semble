'use client';

import useMyCards from '@/features/cards/lib/queries/useMyCards';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import useSimilarCards from '@/features/semble/lib/queries/useSimilarCards';
import { Box, Group, Scroller, Stack, Text, Title } from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { LinkButton } from '@/components/link/MantineLink';

export default function DiscoverOnSemble() {
  const { data: profile } = useMyProfile();
  const { data: myCardsData } = useMyCards({ limit: 8 });
  const { data: similarCardsData } = useSimilarCards({
    url:
      myCardsData.pages[0].cards[0]?.url ??
      `https://bsky.app/profile/${profile?.handle}`,
    limit: 6,
  });
  const cards = similarCardsData.pages.flatMap((page) => page.urls) ?? [];

  return (
    <Stack>
      <Group justify="space-between">
        <Stack gap={0}>
          <Group gap="xs">
            <MdOutlineEmojiNature size={22} />
            <Title order={2}>Discover on Semble</Title>
          </Group>
          <Text fw={500} fz={'lg'}>
            {`Recommendations based on your ${
              myCardsData.pages[0].cards.length > 0 ? 'activity' : 'profile'
            }`}
          </Text>
        </Stack>
        <LinkButton variant="light" color="blue" href={'/explore'}>
          Explore
        </LinkButton>
      </Group>

      {cards.length > 0 ? (
        <Scroller scrollAmount={320}>
          <Group wrap="nowrap" align="stretch" gap="xs">
            {cards.slice(0, 10).map((item, i) => (
              <Box
                key={i}
                w={300}
                style={{ flexShrink: 0, whiteSpace: 'normal' }}
              >
                <SimilarUrlCard urlView={item} />
              </Box>
            ))}
          </Group>
        </Scroller>
      ) : (
        <Stack align="center" gap="xs">
          <Text fz="h3" fw={600} c="gray">
            No recent activity to show yet
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
