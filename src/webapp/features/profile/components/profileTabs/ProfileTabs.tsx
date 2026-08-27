'use client';

import { Paper, Scroller, Tabs } from '@mantine/core';
import TabItem from './TabItem';
import TabCount from '@/components/tabCount/TabCount';
import { usePathname } from 'next/navigation';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import useProfile from '../../lib/queries/useProfile';

interface Props {
  handle: string;
}

export default function ProfileTabs(props: Props) {
  const pathname = usePathname();
  const segment = pathname.split('/')[3];
  const currentTab = segment || 'activity'; // treat base route as 'activity'
  const basePath = `/profile/${props.handle}`;
  const { data: featureFlags } = useFeatureFlags();
  const { data: profile, isError } = useProfile({
    didOrHandle: props.handle,
    includeStats: true,
  });
  // undefined while loading, null when the stats request failed
  const stats = isError ? null : profile;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <Tabs.List style={{ flexWrap: 'nowrap' }}>
          <Scroller>
            <TabItem value="activity" href={basePath}>
              Activity
            </TabItem>
            <TabItem
              value="cards"
              href={`${basePath}/cards`}
              rightSection={
                <TabCount count={stats && (stats.urlCardCount ?? 0)} />
              }
            >
              Cards
            </TabItem>
            <TabItem
              value="collections"
              href={`${basePath}/collections`}
              rightSection={
                <TabCount count={stats && (stats.collectionCount ?? 0)} />
              }
            >
              Collections
            </TabItem>
            <TabItem
              value="connections"
              href={`${basePath}/connections`}
              rightSection={
                <TabCount count={stats && (stats.connectionCount ?? 0)} />
              }
            >
              Connections
            </TabItem>
            <TabItem value="network" href={`${basePath}/network`}>
              Network
            </TabItem>
            {featureFlags?.graphView && (
              <TabItem value="graph" href={`${basePath}/graph`}>
                Graph
              </TabItem>
            )}
          </Scroller>
        </Tabs.List>
      </Paper>
    </Tabs>
  );
}
