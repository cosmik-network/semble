'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Code,
  Alert,
  Box,
  Badge,
  Image,
  Group,
  Anchor,
  CopyButton,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';


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
      __html: `<a href="${bookmarkletCode}" style="text-decoration: none; padding: 8px 16px; background-color: var(--mantine-color-tangerine-6); color: white; border-radius: 100px; display: inline-flex; align-items: center; gap: 8px; font-weight: 600;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>Open in Semble</a>`,
    };
  };

  return (
    <Container size="sm" p="md">
      <Stack gap="xl">
        <Stack gap="xs" align="center">
          <Stack align="center" gap={'xs'}>
            <Anchor href={'/'}>
              <Image
                src={SembleLogo.src}
                alt="Semble logo"
                w={48}
                h={64.5}
                mx={'auto'}
              />
              <Badge size="sm">Alpha</Badge>
            </Anchor>
          </Stack>
          <Stack gap={'xs'} align="center">
            <Title order={1}>Semble Bookmarklet</Title>
            <Title
              order={2}
              size="xl"
              c="dimmed"
              fw={600}
              maw={500}
              ta={'center'}
            >
              Add this bookmarklet to your browser to quickly open any webpage
              in Semble.
            </Title>
          </Stack>
        </Stack>

        <Alert title="How to install" color="grape">
          <Stack gap="sm">
            <Group gap={'xs'}>
              <Badge size="md" color="grape" circle>
                1
              </Badge>
              <Text fw={500} c="grape">
                Copy the bookmarklet code below or drag the button to your
                bookmarks bar
              </Text>
            </Group>
            <Group gap={'xs'}>
              <Badge size="md" color="grape" circle>
                2
              </Badge>

              <Text fw={500} c={'grape'}>
                {
                  "When you're on any webpage, click the bookmarklet to open it in Semble"
                }
              </Text>
            </Group>
          </Stack>
        </Alert>

        <Stack gap="md">
          <Stack gap={'xs'}>
            <Title order={3}>Method 1: Drag to Bookmarks Bar</Title>
            <Text c="dimmed" fw={500}>
              {"Drag this button directly to your browser's bookmarks bar:"}
            </Text>
          </Stack>
          <Group>
            <Box dangerouslySetInnerHTML={createBookmarkletLink()} />
          </Group>
        </Stack>

        <Stack gap="md">
          <Stack gap={'xs'}>
            <Title order={3}>Method 2: Copy Code</Title>
            <Text c="dimmed" fw={500}>
              Copy this code and create a new bookmark with it as the URL:
            </Text>
          </Stack>
          <Box pos="relative">
            <Code
              block
              p="md"
              style={{
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
              }}
            >
              {bookmarkletCode}
            </Code>
            <CopyButton value={bookmarkletCode}>
              {({ copied, copy }) => (
                <Button
                  color="dark"
                  pos={'absolute'}
                  top={12}
                  right={12}
                  onClick={copy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              )}
            </CopyButton>
          </Box>
        </Stack>
      </Stack>
    </Container>
  );
}
