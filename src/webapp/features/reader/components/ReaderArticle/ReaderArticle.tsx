'use client';

import { useRef } from 'react';
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
import { MdErrorOutline } from 'react-icons/md';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReaderContent } from '@/app/api/reader/route';
import { stripLinks } from '../../lib/utils/stripLinks';
import type { ReaderSettings } from '../ReaderTextSettings/ReaderTextSettings';
import ReaderArticleSkeleton from './Skeleton.ReaderArticle';
import styles from './ReaderArticle.module.css';

interface Props {
  reader: UseQueryResult<ReaderContent>;
  settings: ReaderSettings;
}

export default function ReaderArticle(props: Props) {
  const { reader, settings } = props;
  const articleRef = useRef<HTMLDivElement>(null);

  const content = reader.data?.content ?? '';
  const html = settings.showLinks ? content : stripLinks(content);

  return (
    <ScrollArea style={{ flex: 1 }}>
      <Container
        size={settings.wide ? 'md' : 'sm'}
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
              ref={articleRef}
              dangerouslySetInnerHTML={{ __html: html }}
              className={styles.readerContent}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: 1.8,
                color: 'var(--mantine-color-text)',
                marginTop: '1.5rem',
              }}
            />
          </Stack>
        )}
      </Container>
    </ScrollArea>
  );
}
