'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Drawer,
  Tooltip,
  Stack,
  Title,
  Text,
  Alert,
  ScrollArea,
  Box,
  Group,
  CloseButton,
  Skeleton,
  Button,
  Anchor,
  Container,
} from '@mantine/core';
import { TbBook2, TbExternalLink, TbLink, TbLinkOff } from 'react-icons/tb';
import { MdErrorOutline } from 'react-icons/md';
import {
  fetchReaderContent,
  type ReaderState,
} from '../../lib/fetchReaderContent';
import styles from './ReaderButton.module.css';

interface Props {
  url: string;
}

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_STEP = 2;
const FONT_SIZE_DEFAULT = 17;

function ArticleSkeleton() {
  return (
    <Stack gap="sm">
      <Skeleton height={12} width="15%" radius="sm" />
      <Skeleton height={36} width="90%" radius="sm" />
      <Skeleton height={36} width="70%" radius="sm" />
      <Skeleton height={12} width="25%" radius="sm" mt={4} />
      <Box mt="xl">
        {[100, 95, 88, 100, 92, 78, 100, 96, 83, 60].map((w, i) => (
          <Skeleton key={i} height={14} width={`${w}%`} radius="sm" mb={10} />
        ))}
      </Box>
      <Box mt="xs">
        {[100, 91, 100, 85, 100, 72].map((w, i) => (
          <Skeleton key={i} height={14} width={`${w}%`} radius="sm" mb={10} />
        ))}
      </Box>
    </Stack>
  );
}

export default function ReaderButton({ url }: Props) {
  const [opened, setOpened] = useState(false);
  const [state, setState] = useState<ReaderState>({ status: 'idle' });
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [removeLinks, setRemoveLinks] = useState(false);

  const displayedHtml =
    state.status === 'success'
      ? removeLinks
        ? state.data.content.replace(/<a[^>]*>([\s\S]*?)<\/a>/g, '$1')
        : state.data.content
      : '';

  function openReader() {
    setOpened(true);
    if (state.status === 'success' || state.status === 'loading') return;
    fetchReaderContent(url, setState);
  }

  function handleClose() {
    setOpened(false);
  }

  return (
    <>
      <Button
        variant="light"
        color="gray"
        radius="xl"
        leftSection={<TbBook2 size={18} />}
        onClick={openReader}
        aria-label="Open reader mode"
      >
        Reader
      </Button>

      <Drawer
        opened={opened}
        onClose={handleClose}
        position="bottom"
        size="full"
        padding={0}
        withCloseButton={false}
        styles={{
          content: { display: 'flex', flexDirection: 'column' },
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* ── Scrollable article area ── */}
        <ScrollArea style={{ flex: 1 }}>
          <Container
            size={'sm'}
            px="xl"
            style={{
              paddingTop: '2.5rem',
              paddingBottom: '3rem',
            }}
          >
            {state.status === 'loading' && <ArticleSkeleton />}

            {state.status === 'error' && (
              <Stack gap="md">
                <Alert
                  icon={<MdErrorOutline size={20} />}
                  title="Could not load reader"
                  color="red"
                  variant="light"
                >
                  {state.message}
                </Alert>
                <Button
                  variant="default"
                  size="sm"
                  radius="xl"
                  onClick={() => fetchReaderContent(url, setState)}
                >
                  Try again
                </Button>
              </Stack>
            )}

            {state.status === 'success' && (
              <Stack gap="xs">
                {state.data.siteName && (
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {state.data.siteName}
                  </Text>
                )}

                {state.data.title && (
                  <Title
                    order={1}
                    style={{ lineHeight: 1.2, fontSize: '1.75rem' }}
                  >
                    {state.data.title}
                  </Title>
                )}

                {state.data.byline && (
                  <Text size="sm" c="dimmed" mt={2}>
                    {state.data.byline}
                  </Text>
                )}

                <Box
                  component="article"
                  dangerouslySetInnerHTML={{ __html: displayedHtml }}
                  className={styles.readerContent}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.8,
                    color: 'var(--mantine-color-text)',
                    marginTop: '1.5rem',
                  }}
                />
              </Stack>
            )}
          </Container>
        </ScrollArea>

        {/* ── Sticky bottom bar ── */}
        <Box className={styles.bottomBar}>
          <Group px="lg" py="xs" justify="space-between" align="center">
            {/* Left: font size + link toggle */}
            <Group gap="xs">
              <Tooltip label="Decrease font size" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="md"
                  radius="xl"
                  onClick={() =>
                    setFontSize((s) =>
                      Math.max(FONT_SIZE_MIN, s - FONT_SIZE_STEP),
                    )
                  }
                  disabled={fontSize <= FONT_SIZE_MIN}
                  aria-label="Decrease font size"
                >
                  <Text size="xs" fw={700}>
                    A-
                  </Text>
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Increase font size" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="md"
                  radius="xl"
                  onClick={() =>
                    setFontSize((s) =>
                      Math.min(FONT_SIZE_MAX, s + FONT_SIZE_STEP),
                    )
                  }
                  disabled={fontSize >= FONT_SIZE_MAX}
                  aria-label="Increase font size"
                >
                  <Text size="xs" fw={700}>
                    A+
                  </Text>
                </ActionIcon>
              </Tooltip>
              <Tooltip
                label={removeLinks ? 'Show links' : 'Remove links'}
                withArrow
                position="top"
              >
                <ActionIcon
                  variant={removeLinks ? 'filled' : 'light'}
                  color={'gray'}
                  size="md"
                  radius="xl"
                  onClick={() => setRemoveLinks((v) => !v)}
                  aria-label={removeLinks ? 'Show links' : 'Remove links'}
                >
                  {removeLinks ? <TbLinkOff size={16} /> : <TbLink size={16} />}
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Right: open original + close */}
            <Group gap="xs">
              <Anchor
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                underline="never"
              >
                <Button
                  variant="light"
                  color="gray"
                  size="xs"
                  radius="xl"
                  rightSection={<TbExternalLink size={14} />}
                >
                  Open original
                </Button>
              </Anchor>

              <CloseButton
                size="lg"
                radius={'xl'}
                onClick={handleClose}
                aria-label="Close reader mode"
              />
            </Group>
          </Group>
        </Box>
      </Drawer>
    </>
  );
}
