'use client';

import { Paper, Scroller, Tabs } from '@mantine/core';
import LinkTab from '@/components/navigation/linkTab/LinkTab';
import TabCount from '@/components/tabCount/TabCount';
import { usePathname } from 'next/navigation';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { useProfileWithStats } from '../../lib/queries/useProfile';

interface Props {
  handle: string;
}

export default function ProfileTabs(props: Props) {
  const pathname = usePathname();
  const segment = pathname.split('/')[3];
  const currentTab = segment || 'activity'; // treat base route as 'activity'
  const basePath = `/profile/${props.handle}`;
  const { data: featureFlags } = useFeatureFlags();
  const { data: profile, isError } = useProfileWithStats({
    didOrHandle: props.handle,
  });
  // undefined while loading, null when the stats request failed
  const stats = isError ? null : profile;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <Tabs.List style={{ flexWrap: 'nowrap' }}>
          <Scroller>
            <LinkTab value="activity" href={basePath}>
              Activity
            </LinkTab>
            <LinkTab
              value="cards"
              href={`${basePath}/cards`}
              rightSection={
                <TabCount count={stats && (stats.urlCardCount ?? 0)} />
              }
            >
              Cards
            </LinkTab>
            <LinkTab
              value="collections"
              href={`${basePath}/collections`}
              rightSection={
                <TabCount count={stats && (stats.collectionCount ?? 0)} />
              }
            >
              Collections
            </LinkTab>
            <LinkTab
              value="connections"
              href={`${basePath}/connections`}
              rightSection={
                <TabCount count={stats && (stats.connectionCount ?? 0)} />
              }
            >
              Connections
            </LinkTab>
            <LinkTab value="network" href={`${basePath}/network`}>
              Network
            </LinkTab>
            {featureFlags?.graphView && (
              <LinkTab value="graph" href={`${basePath}/graph`}>
                Graph
              </LinkTab>
            )}
          </Scroller>
        </Tabs.List>
      </Paper>
    </Tabs>
  );
}
