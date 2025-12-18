'use client';

import useMyCards from '@/features/cards/lib/queries/useMyCards';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import useSembleSimilarCards from '@/features/semble/lib/queries/useSembleSimilarCards';
import { useNavbarContext } from '@/providers/navbar';
import { Button, Grid, Group, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { MdOutlineEmojiNature } from 'react-icons/md';

export default function DiscoverOnSemble() {
  const { desktopOpened } = useNavbarContext();
  const { data: profile } = useMyProfile();
  const { data: myCardsData } = useMyCards({ limit: 8 });
  const { data: similarCardsData } = useSembleSimilarCards({
    url:
      myCardsData.pages[0].cards[0]?.url ??
      `https://bsky.app/profile/${profile?.handle}`,
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
        <Button variant="light" component={Link} color="blue" href={'/explore'}>
          Explore
        </Button>
      </Group>

      {cards.length > 0 ? (
        <Grid gutter={'xs'}>
          {cards.slice(0, 3).map((item, i) => (
            <Grid.Col
              key={i}
              span={{
                base: 12,
                xs: desktopOpened ? 12 : 6,
                sm: desktopOpened ? 6 : 4,
                md: 4,
              }}
            >
              <SimilarUrlCard urlView={item} />
            </Grid.Col>
          ))}
        </Grid>
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
