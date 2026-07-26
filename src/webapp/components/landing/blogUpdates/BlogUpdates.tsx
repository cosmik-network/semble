import { Anchor, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { Fragment } from 'react';
import EmailSubscribe from '@/components/landing/emailSubscribe/EmailSubscribe';
import { getCosmikBlogPosts } from '@/features/platforms/leaflet/lib/dal';

const POST_COUNT = 3;

/**
 * Closes the landing page with the latest blog posts above the email form.
 *
 * The posts are the point — they're what makes subscribing look worth it, where
 * the form on its own is a button asking for an address with nothing behind it.
 * Posts come from Cosmik's AT Protocol repo (see the dal), cached hourly, and
 * the block degrades to just the form if that read fails.
 */
export default async function BlogUpdates() {
  const posts = await getCosmikBlogPosts(POST_COUNT);

  return (
    // mx="auto" so the block centres itself rather than relying on a parent's
    // align — it sits directly in the page's section stack, which stretches.
    // px below the xs breakpoint: the footer gives this block no gutter of its
    // own, so on narrow screens the rows would otherwise run to the viewport
    // edge and get clipped by the footer's overflow:hidden. xs (36em) is the
    // first breakpoint past maw 520, where the gutter stops mattering.
    <Stack
      align="center"
      gap="md"
      w="100%"
      maw={520}
      mx="auto"
      px={{ base: 'md', xs: 0 }}
    >
      {posts.length > 0 && (
        <Fragment>
          {/* Deliberately below SECTION_TITLE_SIZE: this is a sub-block, and a
              full section title here would rank it alongside Curate/Discover. */}
          <Title order={3} fz="lg" ta="center">
            Hear from the team
          </Title>

          <Stack gap={0} w="100%">
            {posts.map((post, index) => (
              <Fragment key={post.url}>
                {index > 0 && <Divider color="gray.5" />}
                <Anchor
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  display="block"
                  py="xs"
                  c="bright"
                  underline="hover"
                >
                  {/* Date is nowrap and sits opposite the title, so a long
                      title wraps against it instead of pushing it off. */}
                  <Group justify="space-between" wrap="nowrap" gap="md">
                    <Text fw={600} fz="sm" lh={1.35}>
                      {post.title}
                    </Text>
                    <Text
                      fz="xs"
                      c="dimmed"
                      style={{ whiteSpace: 'nowrap' }}
                      component="time"
                      dateTime={post.publishedAt}
                    >
                      {formatPublishedAt(post.publishedAt)}
                    </Text>
                  </Group>
                </Anchor>
              </Fragment>
            ))}
          </Stack>
        </Fragment>
      )}

      <EmailSubscribe />
    </Stack>
  );
}

/**
 * "Jul 17", dropping to "Jul 17, 2026" once a post isn't from this year — a
 * bare month and day reads as recent, which stops being true for older posts.
 * Formatted in UTC so the server and client agree on the day.
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
