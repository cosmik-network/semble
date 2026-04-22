'use client';

import { Group, Paper, Scroller, Tabs } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import TabItem from './TabItem';
import ContributorTab from './ContributorTab';
import { getCollectionPageByAtUri } from '../../lib/dal';
import { collectionKeys } from '../../lib/collectionKeys';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';

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

  const { data: collection } = useQuery({
    queryKey: [...collectionKeys.all(), 'stats', props.rkey],
    queryFn: () =>
      getCollectionPageByAtUri({
        recordKey: props.rkey,
        handle: props.handle,
        params: { limit: 1 },
      }),
  });

  const { data: urlMetadata } = useUrlMetadata({
    url: collectionUrl,
    includeStats: true,
  });

  const stats = urlMetadata?.stats;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <Tabs.List>
          <Scroller>
            <Group wrap="nowrap">
              <TabItem
                value="cards"
                href={basePath}
                count={collection?.cardCount}
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
                count={stats?.connections?.all?.total}
              >
                Connections
              </TabItem>
              <TabItem
                value="followers"
                href={`${basePath}/followers`}
                count={collection?.followerCount}
              >
                Followers
              </TabItem>
              <ContributorTab
                handle={props.handle}
                rkey={props.rkey}
                basePath={basePath}
              />
              <TabItem
                value="added-by"
                href={`${basePath}/added-by`}
                count={stats?.libraryCount}
              >
                Added by
              </TabItem>
            </Group>
          </Scroller>
        </Tabs.List>
      </Paper>
    </Tabs>
  );
}
