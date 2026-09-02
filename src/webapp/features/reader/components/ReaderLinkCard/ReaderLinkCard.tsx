'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Anchor, Stack, Text } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';
import { CardSaveSource } from '@/features/analytics/types';
import { getDomain } from '@/lib/utils/link';
import type { ReaderLink } from '../../lib/useReaderLinks';

interface Props {
  link: ReaderLink;
  /** The article being read */
  articleUrl: string;
}

function PlainLink(props: { link: ReaderLink }) {
  return (
    <Stack gap={0}>
      <Anchor
        href={props.link.href}
        target="_blank"
        rel="noopener noreferrer"
        fw={500}
        c="bright"
        lineClamp={1}
      >
        {props.link.text}
      </Anchor>
      <Text size="xs" c="dimmed" truncate>
        {getDomain(props.link.href)}
      </Text>
    </Stack>
  );
}

function LoadedCard(props: Props) {
  const { data } = useUrlMetadata({ url: props.link.href });

  return (
    <UrlCard
      id={data.metadata.url}
      url={data.metadata.url}
      cardContent={data.metadata}
      urlLibraryCount={data.stats?.libraryCount ?? 0}
      urlIsInLibrary={data.urlInLibrary ?? false}
      urlConnectionCount={data.stats?.connections.all.total ?? 0}
      urlIsConnected={data.urlIsConnected}
      semblePageUrl={props.articleUrl}
      analyticsContext={{ saveSource: CardSaveSource.READER }}
      // Above the reader and links drawers, like the reader's own modals
      modalZIndex={300}
    />
  );
}

export default function ReaderLinkCard(props: Props) {
  return (
    <ErrorBoundary fallback={<PlainLink link={props.link} />}>
      <Suspense fallback={<UrlCardSkeleton />}>
        <LoadedCard {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
