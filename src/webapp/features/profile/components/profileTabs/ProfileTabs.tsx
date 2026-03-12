'use client';

import { Group, Paper, ScrollAreaAutosize, Tabs } from '@mantine/core';
import TabItem from './TabItem';
import { usePathname } from 'next/navigation';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import useProfile from '../../lib/queries/useProfile';

interface Props {
  handle: string;
}

export default function ProfileTabs(props: Props) {
  const pathname = usePathname();
  const segment = pathname.split('/')[3];
  const currentTab = segment || 'profile'; // treat base route as 'profile'
  const basePath = `/profile/${props.handle}`;
  const { data: featureFlags } = useFeatureFlags();
  const { data: profile } = useProfile({
    didOrHandle: props.handle,
    includeStats: true,
  });

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <ScrollAreaAutosize type="scroll">
          <Tabs.List style={{ flexWrap: 'nowrap' }}>
            <TabItem value="profile" href={basePath}>
              Profile
            </TabItem>
            <TabItem
              value="cards"
              href={`${basePath}/cards`}
              count={profile.urlCardCount}
            >
              Cards
            </TabItem>
            <TabItem
              value="collections"
              href={`${basePath}/collections`}
              count={profile.collectionCount}
            >
              Collections
            </TabItem>
            {featureFlags?.connections && (
              <TabItem value="connections" href={`${basePath}/connections`}>
                Connections
              </TabItem>
            )}
            <TabItem value="network" href={`${basePath}/network`}>
              Network
            </TabItem>
          </Tabs.List>
        </ScrollAreaAutosize>
      </Paper>
    </Tabs>
  );
}
