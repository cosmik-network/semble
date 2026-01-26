import { getUrlCards } from '@/features/cards/lib/dal';
import {
  Button,
  Card,
  Group,
  ScrollAreaAutosize,
  Stack,
  Text,
} from '@mantine/core';
import Link from 'next/link';
import { BiRightArrowAlt } from 'react-icons/bi';
import ActivityCard from '../activityCard/ActivityCard';
import ActivityCardSkeleton from '../activityCard/Skeleton.ActivityCard';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

const getRecentActivity = unstable_cache(
  async () => {
    const results = await Promise.all([
      getUrlCards('ronentk.me', { limit: 1 }),
      getUrlCards('wesleyfinck.org', { limit: 1 }),
      getUrlCards('pouriade.com', { limit: 1 }),
      getUrlCards('tynanpurdy.com', { limit: 1 }),
      getUrlCards('erlend.sh', { limit: 1 }),
      getUrlCards('bmann.ca', { limit: 1 }),
      getUrlCards('tgoerke.bsky.social', { limit: 1 }),
      getUrlCards('psingletary.com', { limit: 1 }),
    ]);

    return results
      .flatMap((result) => result.cards)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  },
  ['recent-activity-cards'],
  {
    revalidate: 60 * 60 * 3, // every 3 hours
  },
);

export default async function RecentActivity() {
  const combined = await getRecentActivity();

  return (
    <Card withBorder component="article" p="xs" radius="lg">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <Text fz="xl" fw={600}>
            Highlights from our community
          </Text>
          <Button
            component={Link}
            href="/explore"
            variant="light"
            color="gray"
            rightSection={<BiRightArrowAlt size={20} />}
          >
            Explore
          </Button>
        </Group>

        <ScrollAreaAutosize type="auto" mah={{ base: 250, xs: 400 }}>
          <Stack gap="lg">
            {combined.map((card, i) => (
              <Suspense key={i} fallback={<ActivityCardSkeleton />}>
                <ActivityCard
                  id={card.id}
                  url={card.url}
                  note={card.note}
                  cardAuthor={card.author}
                  cardContent={card.cardContent}
                  createdAt={card.createdAt}
                  urlLibraryCount={card.urlLibraryCount}
                />
              </Suspense>
            ))}
          </Stack>
        </ScrollAreaAutosize>
      </Stack>
    </Card>
  );
}
