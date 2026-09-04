'use client';

import { Paper, Scroller, Tabs } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import LinkTab from '@/components/navigation/linkTab/LinkTab';
import TabCount from '@/components/tabCount/TabCount';
import { getCollectionPageByAtUri } from '../../lib/dal';
import { collectionKeys } from '../../lib/collectionKeys';
import { useUrlMetadataWithStats } from '@/features/cards/lib/queries/useUrlMetadata';

interface Props {
  handle: string;
  rkey: string;
}

export default function CollectionTabs(props: Props) {
  const pathname = usePathname();
  const segment = pathname.split('/')[5]; // Index 5 is the segment after rkey
  const currentTab = segment || 'cards'; // treat base route as 'cards'
  const basePath = `/profile/${props.handle}/collections/${props.rkey}`;

  const collectionUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:4000'}/profile/${props.handle}/collections/${props.rkey}`;

  const { data: collection, isError: isCollectionError } = useQuery({
    queryKey: [...collectionKeys.all(), 'stats', props.rkey],
    queryFn: () =>
      getCollectionPageByAtUri({
        recordKey: props.rkey,
        handle: props.handle,
        params: { limit: 1 },
      }),
  });

  const { data: urlMetadata, isError: isStatsError } = useUrlMetadataWithStats({
    url: collectionUrl,
  });

  // Two independent sources, so each resolves — or fails — on its own.
  // undefined while loading, null when the request failed.
  const details = isCollectionError ? null : collection;
  const stats = isStatsError ? null : urlMetadata?.stats;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <Tabs.List style={{ flexWrap: 'nowrap' }}>
          <Scroller>
            <LinkTab
              value="cards"
              href={basePath}
              rightSection={<TabCount count={details && details.cardCount} />}
            >
              Cards
            </LinkTab>
            <LinkTab value="similar-cards" href={`${basePath}/similar-cards`}>
              Similar cards
            </LinkTab>
            <LinkTab value="mentions" href={`${basePath}/mentions`}>
              Mentions
            </LinkTab>
            <LinkTab
              value="connections"
              href={`${basePath}/connections`}
              rightSection={
                <TabCount count={stats && stats.connections.all.total} />
              }
            >
              Connections
            </LinkTab>
            <LinkTab
              value="appears-in"
              href={`${basePath}/appears-in`}
              rightSection={<TabCount count={stats && stats.collectionCount} />}
            >
              Appears in
            </LinkTab>
          </Scroller>
        </Tabs.List>
      </Paper>
    </Tabs>
  );
}
