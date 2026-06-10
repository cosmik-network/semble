'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Paper,
  ThemeIcon,
  Timeline,
  TimelineItem,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import {
  MdOutlineCollectionsBookmark,
  MdOutlineBookmarkAdd,
  MdOutlineAdsClick,
  MdOpenInNew,
} from 'react-icons/md';
import GuideHeader from '@/components/guides/GuideHeader';
import GuideFooter from '@/components/guides/GuideFooter';

export default function BookmarkletPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

  const bookmarkletCode = `javascript:(function(){
    const currentUrl = window.location.href;
    const sembleUrl = '${appUrl}/url?id=' + currentUrl;
    window.open(sembleUrl, '_blank');
})();`;

  // Create the bookmarklet link using dangerouslySetInnerHTML to bypass React's security check
  const createBookmarkletLink = () => {
    return {
      __html: `<a href="${bookmarkletCode}" style="text-decoration: none; padding: 10px 20px; background-color: var(--mantine-color-tangerine-6); color: white; border-radius: 100px; display: inline-flex; align-items: center; gap: 8px; font-weight: 600;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>Open in Semble</a>`,
    };
  };

  return (
    <Container size="xs" p="md" py="xl">
      <Stack gap="xl">
        <GuideHeader
          title="Semble Bookmarklet"
          subtitle="Save any webpage to Semble with one click from your bookmarks bar."
        />

        <Paper radius="lg" p="xl" bg="var(--mantine-color-default-hover)">
          <Stack align="center" gap="lg">
            <ThemeIcon
              size={72}
              radius="lg"
              variant="white"
              c="tangerine"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <MdOutlineCollectionsBookmark size={36} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Title order={3} ta="center">
                Get the bookmarklet
              </Title>
              <Text c="dimmed" fw={500} ta="center" maw={370}>
                Drag this button to your browser's bookmarks bar.
              </Text>
            </Stack>
            <Box dangerouslySetInnerHTML={createBookmarkletLink()} />
          </Stack>
        </Paper>

        <Stack gap="lg">
          <Title order={3}>How it works</Title>
          <Timeline active={3} bulletSize={36} lineWidth={3} color="green">
            <TimelineItem
              bullet={<MdOutlineBookmarkAdd size={20} />}
              title="Add it to your bookmarks"
            >
              <Text c="dimmed" fw={500}>
                Drag the button above to your bookmarks bar.
              </Text>
            </TimelineItem>
            <TimelineItem
              bullet={<MdOutlineAdsClick size={20} />}
              title="Click it on any webpage"
            >
              <Text c="dimmed" fw={500}>
                When you find something worth saving, click the bookmarklet in
                your bookmarks bar.
              </Text>
            </TimelineItem>
            <TimelineItem
              bullet={<MdOpenInNew size={20} />}
              title="Open it in Semble"
            >
              <Text c="dimmed" fw={500}>
                The page opens in Semble, ready to add to your library.
              </Text>
            </TimelineItem>
          </Timeline>
        </Stack>

        <Stack gap="md">
          <Stack gap={4}>
            <Title order={3}>Prefer to set it up manually?</Title>
            <Text c="dimmed" fw={500}>
              Create a new bookmark and paste this code as the URL:
            </Text>
          </Stack>
          <CodeHighlight
            code={bookmarkletCode}
            language="js"
            radius="md"
            copyLabel="Copy"
            copiedLabel="Copied!"
          />
        </Stack>

        <GuideFooter />
      </Stack>
    </Container>
  );
}
