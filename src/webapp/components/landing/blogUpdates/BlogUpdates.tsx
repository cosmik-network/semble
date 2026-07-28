import { Anchor, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { Fragment, Suspense } from 'react';
import { FiArrowUpRight } from 'react-icons/fi';
import EmailSubscribe from '@/components/landing/emailSubscribe/EmailSubscribe';
import { getCosmikBlogPosts } from '@/features/platforms/leaflet/lib/dal';

const POST_COUNT = 3;

/**
 * Closes the landing page with the latest blog posts above the email form.
 *
 * Only the posts are behind the Suspense boundary. Reading them costs two
 * external round-trips (see the dal) on a page that renders dynamically, so
 * awaiting them here would hold the hero back on every cache miss.
 */
export default function BlogUpdates() {
  return (
    // px below xs: the footer gives this block no gutter of its own, so on
    // narrow screens the rows would run to the viewport edge and get clipped by
    // the footer's overflow:hidden.
    <Stack
      align="center"
      gap="md"
      w="100%"
      maw={520}
      mx="auto"
      px={{ base: 'md', xs: 0 }}
    >
      <Suspense fallback={null}>
        <BlogPosts />
      </Suspense>

      <EmailSubscribe />
    </Stack>
  );
}

/** Cached hourly; degrades to just the form if the read fails. */
async function BlogPosts() {
  const posts = await getCosmikBlogPosts(POST_COUNT);
  if (posts.length === 0) return null;

  return (
    <Fragment>
      <Title order={3} fz="lg" ta="center">
        Notes from the team
      </Title>

      {/* mb on the list rather than mt on the form: the form has to keep its
          own spacing when there are no posts and this block doesn't render. */}
      <Stack gap={0} w="100%" mb="lg">
        {posts.map((post, index) => (
          <Fragment key={post.url}>
            {/* No color: Divider's default is the theme's border colour, which
                already tracks the colour scheme. */}
            {index > 0 && <Divider />}
            <Anchor
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              display="block"
              py="xs"
              c="bright"
              underline="hover"
            >
              {/* The date is nowrap and sits opposite the title, so a long title
                  wraps against it instead of pushing it off. */}
              <Group justify="space-between" wrap="nowrap" gap="md">
                <Text fw={600} fz="sm" lh={1.35}>
                  {post.title}
                </Text>
                <Group gap={6} wrap="nowrap" flex="0 0 auto">
                  <Text
                    fw={600}
                    fz="xs"
                    c="dimmed"
                    component="time"
                    dateTime={post.publishedAt}
                  >
                    {formatPublishedAt(post.publishedAt)}
                  </Text>
                </Group>
              </Group>
            </Anchor>
          </Fragment>
        ))}
      </Stack>
    </Fragment>
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
