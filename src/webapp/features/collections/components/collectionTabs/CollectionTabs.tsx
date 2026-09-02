'use client';

import { Paper, Scroller, Tabs } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import TabItem from './TabItem';
import TabCount from '@/components/tabCount/TabCount';
import { getCollectionPageByAtUri } from '../../lib/dal';
import { getCollectionContributors } from '../../lib/dal';
import { collectionKeys } from '../../lib/collectionKeys';
import { CollectionAccessType } from '@semble/types';
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

  // Three independent sources, so each resolves — or fails — on its own.
  // undefined while loading, null when the request failed.
  const details = isCollectionError ? null : collection;
  const stats = isStatsError ? null : urlMetadata?.stats;

  const isOpen = collection?.accessType === CollectionAccessType.OPEN;

  const { data: contributors, isError: isContributorsError } = useQuery({
    queryKey: [
      ...collectionKeys.collection(collection?.id ?? ''),
      'contributors-count',
    ],
    queryFn: () => getCollectionContributors(collection!.id, { limit: 1 }),
    enabled: isOpen && !!collection?.id,
  });

  const contributorCount = isContributorsError
    ? null
    : contributors?.pagination.totalCount;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <Tabs.List style={{ flexWrap: 'nowrap' }}>
          <Scroller>
            <TabItem
              value="cards"
              href={basePath}
              rightSection={<TabCount count={details && details.cardCount} />}
            >
              Cards
            </TabItem>
            <TabItem value="similar-cards" href={`${basePath}/similar-cards`}>
              Similar cards
            </TabItem>
            <TabItem value="mentions" href={`${basePath}/mentions`}>
              Mentions
            </TabItem>
            <TabItem
              value="connections"
              href={`${basePath}/connections`}
              rightSection={
                <TabCount count={stats && stats.connections.all.total} />
              }
            >
              Connections
            </TabItem>
            <TabItem
              value="followers"
              href={`${basePath}/followers`}
              rightSection={
                <TabCount count={details && (details.followerCount ?? 0)} />
              }
            >
              Followers
            </TabItem>
            <TabItem
              value="added-by"
              href={`${basePath}/added-by`}
              rightSection={<TabCount count={stats && stats.libraryCount} />}
            >
              Added by
            </TabItem>
            <TabItem
              value="appears-in"
              href={`${basePath}/appears-in`}
              rightSection={<TabCount count={stats && stats.collectionCount} />}
            >
              Appears in
            </TabItem>
            {isOpen && (
              <TabItem
                value="contributors"
                href={`${basePath}/contributors`}
                rightSection={<TabCount count={contributorCount} />}
              >
                Contributors
              </TabItem>
            )}
          </Scroller>
        </Tabs.List>
      </Paper>
    </Tabs>
  );
}
