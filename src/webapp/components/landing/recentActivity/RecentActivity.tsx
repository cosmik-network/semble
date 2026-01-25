import { getUrlCards } from '@/features/cards/lib/dal';
import {
  Button,
  Card,
  Group,
  ScrollAreaAutosize,
  Stack,
  Text,
} from '@mantine/core';
import ActivityCard from './ActivityCard';
import Link from 'next/link';
import { BiRightArrowAlt } from 'react-icons/bi';

export default async function RecentActivity() {
  const [
    { cards: ronenCards },
    { cards: wesleyCards },
    { cards: pouriaCards },
  ] = await Promise.all([
    getUrlCards('ronentk.me', { limit: 1 }),
    getUrlCards('wesleyfinck.org', { limit: 1 }),
    getUrlCards('pouriade.com', { limit: 1 }),
  ]);

  const combined = [...ronenCards, ...wesleyCards, ...pouriaCards].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Stack gap={'md'}>
        <Group gap={'xs'} justify="space-between">
          <Text fz={'xl'} fw={600}>
            Latest from our team
          </Text>
          <Button
            component={Link}
            href={'/explore'}
            variant="light"
            color={'gray'}
            rightSection={<BiRightArrowAlt size={20} />}
          >
            Explore Semble
          </Button>
        </Group>
        <ScrollAreaAutosize type="auto" mah={400}>
          <Stack gap="xs">
            {combined.map((card, i) => (
              <ActivityCard
                key={i}
                id={card.id}
                url={card.url}
                note={card.note}
                cardAuthor={card.author}
                cardContent={card.cardContent}
                urlLibraryCount={card.urlLibraryCount}
              />
            ))}
          </Stack>
        </ScrollAreaAutosize>
      </Stack>
    </Card>
  );
}
