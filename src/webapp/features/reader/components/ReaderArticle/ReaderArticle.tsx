'use client';

import {
  Alert,
  Box,
  Button,
  Container,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { MdErrorOutline } from 'react-icons/md';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReaderContent } from '@/app/api/reader/route';
import { useScrollFade } from '@/hooks/useScrollFade';
import { parseReaderContent } from '../../lib/parseReaderContent';
import type {
  ReaderSettings,
  ReaderWidth,
} from '../ReaderTextSettings/ReaderTextSettings';
import ReaderArticleSkeleton from './Skeleton.ReaderArticle';
import styles from './ReaderArticle.module.css';

interface Props {
  reader: UseQueryResult<ReaderContent>;
  settings: ReaderSettings;
  articleUrl: string;
}

const CONTAINER_SIZE: Record<ReaderWidth, 'xs' | 'sm' | 'md'> = {
  narrow: 'xs',
  cozy: 'sm',
  wide: 'md',
};

export default function ReaderArticle(props: Props) {
  const { reader, settings, articleUrl } = props;
  const { setViewport, maskImage, updateFade } = useScrollFade();

  // Hover opens the popover and click opens the link; on touch, tap opens the popover
  const isHoverDevice = useMediaQuery(
    '(hover: hover) and (pointer: fine)',
    true,
    { getInitialValueInEffect: false },
  );

  const content = reader.data?.content ?? '';
  const article = parseReaderContent(content, {
    articleUrl,
    showLinks: settings.showLinks,
    isHoverDevice,
  });

  return (
    <ScrollArea
      style={{ flex: 1 }}
      viewportRef={setViewport}
      onScrollPositionChange={updateFade}
      styles={{
        viewport: maskImage
          ? { maskImage, WebkitMaskImage: maskImage }
          : undefined,
      }}
    >
      <Container
        size={CONTAINER_SIZE[settings.width]}
        px="xl"
        style={{
          paddingTop: '2.5rem',
          paddingBottom: '7rem',
          transition: 'max-width 0.25s ease',
        }}
      >
        {reader.isPending && <ReaderArticleSkeleton />}

        {reader.isError && (
          <Stack gap="md">
            <Alert
              icon={<MdErrorOutline size={20} />}
              title="Could not load reader"
              color="red"
              variant="light"
            >
              {reader.error.message}
            </Alert>
            <Button
              variant="default"
              size="sm"
              radius="xl"
              onClick={() => reader.refetch()}
            >
              Try again
            </Button>
          </Stack>
        )}

        {reader.data && (
          <Stack gap="xs">
            {reader.data.siteName && (
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                {reader.data.siteName}
              </Text>
            )}
            {reader.data.title && (
              <Title order={1} style={{ lineHeight: 1.2, fontSize: '1.75rem' }}>
                {reader.data.title}
              </Title>
            )}
            {reader.data.byline && (
              <Text size="sm" c="dimmed" mt={2}>
                {reader.data.byline}
              </Text>
            )}
            <Box
              component="article"
              className={styles.readerContent}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: 1.8,
                color: 'var(--mantine-color-text)',
                marginTop: '1.5rem',
              }}
            >
              {article}
            </Box>
          </Stack>
        )}
      </Container>
    </ScrollArea>
  );
}
