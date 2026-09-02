'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Anchor, Card, Stack, Text, Tooltip } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/providers/settings';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';
import { CardSaveSource } from '@/features/analytics/types';
import { getDomain, getSembleHref } from '@/lib/utils/link';
import type { ReaderLink } from '../../lib/useReaderLinks';

interface Props {
  link: ReaderLink;
  /** The article being read */
  articleUrl: string;
}

function PlainLink(props: { link: ReaderLink }) {
  const router = useRouter();
  const { settings } = useSettings();
  const isList = settings.cardView === 'list';

  return (
    <Card
      component="article"
      radius={isList ? 0 : 'lg'}
      p={isList ? 'xs' : 'sm'}
      withBorder={!isList}
      style={{ cursor: 'pointer' }}
      onClick={() => router.push(getSembleHref(props.link.href))}
    >
      <Stack gap={0}>
        <Tooltip label={props.link.href}>
          <Anchor
            onClick={(e) => e.stopPropagation()}
            href={props.link.href}
            target="_blank"
            rel="noopener noreferrer"
            c="gray"
            lineClamp={1}
            w="fit-content"
            fz="sm"
          >
            {getDomain(props.link.href)}
          </Anchor>
        </Tooltip>
        <Text c="bright" lineClamp={2} fw={500}>
          {props.link.text}
        </Text>
      </Stack>
    </Card>
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
