'use client';

import useMyCards from '@/features/cards/lib/queries/useMyCards';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import useSembleSimilarCards from '@/features/semble/lib/queries/useSembleSimilarCards';
import { useNavbarContext } from '@/providers/navbar';
import {
  Button,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { Fragment } from 'react';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

export default function DiscoverOnSemble() {
  const { desktopOpened } = useNavbarContext();
  const { settings } = useUserSettings();
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
        <Grid gutter={settings.cardView === 'list' ? 0 : 'xs'}>
          {cards.slice(0, 3).map((item, i) => (
            <Fragment key={i}>
              {settings.cardView === 'list' && i > 0 && (
                <Grid.Col span={12}>
                  <Divider />
                </Grid.Col>
              )}
              <Grid.Col
                span={{
                  base: 12,
                  xs:
                    settings.cardView !== 'grid' ? 12 : desktopOpened ? 12 : 6,
                  sm: settings.cardView !== 'grid' ? 12 : desktopOpened ? 6 : 4,
                  md: settings.cardView !== 'grid' ? 12 : 4,
                }}
              >
                <SimilarUrlCard urlView={item} />
              </Grid.Col>
            </Fragment>
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
