import { Card, SimpleGrid, Stack, Text } from '@mantine/core';
import { getCosmikBlogPosts } from '@/features/platforms/leaflet/lib/dal';
import styles from './LatestPosts.module.css';

const POST_COUNT = 3;

/**
 * The team's latest posts, as filled cards like the landing page's Extend
 * section. Cached hourly; renders nothing if the read fails. Render it behind
 * Suspense: the read costs two external round-trips (see the dal) on a page
 * that renders dynamically.
 */
export default async function LatestPosts() {
  const posts = await getCosmikBlogPosts(POST_COUNT);
  if (posts.length === 0) return null;

  return (
    <SimpleGrid
      cols={{ base: 1, sm: 3 }}
      spacing="xs"
      w="100%"
      maw={900}
      mt="md"
    >
      {posts.map((post) => (
        <Card
          key={post.url}
          component="a"
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.post}
          bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
          radius="lg"
        >
          <Stack justify="space-between" gap="lg" h="100%">
            <Text fw={600} fz="lg" lh={1.3} lineClamp={2}>
              {post.title}
            </Text>

            <Text
              component="time"
              dateTime={post.publishedAt}
              fz="sm"
              fw={500}
              c="dimmed"
            >
              {formatPublishedAt(post.publishedAt)}
            </Text>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}

/**
 * Only older posts get the year. UTC, or the day shifts with the server's
 * timezone.
 */
function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  const isThisYear = date.getUTCFullYear() === new Date().getUTCFullYear();

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isThisYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
}
