'use client';

import { useState, Suspense } from 'react';
import {
  Box,
  Group,
  ScrollAreaAutosize,
  Tabs,
  TabsList,
  TabsPanel,
} from '@mantine/core';
import TabItem from './TabItem';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import type { UrlAggregateStats } from '@semble/types';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';

import SembleNotesContainer from '../../containers/sembleNotesContainer/SembleNotesContainer';
import SembleNotesContainerSkeleton from '../../containers/sembleNotesContainer/Skeleton.SembleNotesContainer';

import SembleCollectionsContainer from '../../containers/sembleCollectionsContainer/SembleCollectionsContainer';
import SembleCollectionsContainerSkeleton from '../../containers/sembleCollectionsContainer/Skeleton.SembleCollectionsContainer';

import SembleLibrariesContainer from '../../containers/sembleLibrariesContainer/SembleLibrariesContainer';
import SembleLibrariesContainerSkeleton from '../../containers/sembleLibrariesContainer/Skeleton.SembleLibrariesContainer';

import SembleSimilarCardsContainer from '../../containers/sembleSimilarCardsContainer/SembleSimilarCardsContainer';
import SembleSimilarCardsContainerSkeleton from '../../containers/sembleSimilarCardsContainer/Skeleton.SembleSimilarCardsContainer';
import SembleMentionsContainer from '../../containers/sembleMentionsContainer/SembleMentionsContainer';
import SembleMentionsContainerSkeleton from '../../containers/sembleMentionsContainer/Skeleton.SembleMentionsContainer';

import SembleConnectionsContainer from '../../containers/sembleConnectionsContainer/SembleConnectionsContainer';
import SembleConnectionsContainerSkeleton from '../../containers/sembleConnectionsContainer/Skeleton.SembleConnectionsContainer';

interface Props {
  url: string;
  stats?: UrlAggregateStats;
}

type TabValue = 'notes' | 'collections' | 'addedBy' | 'similar' | 'connections';

export default function SembleTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('similar');
  const { data: featureFlags } = useFeatureFlags();
  const { data: urlMetadata } = useUrlMetadata({
    url: props.url,
    includeStats: true,
    initialData: props.stats ? { stats: props.stats } : undefined,
  });

  const stats = urlMetadata?.stats;

  return (
    <Tabs
      keepMounted={false}
      value={activeTab}
      onChange={(val) => setActiveTab(val as TabValue)}
    >
      <ScrollAreaAutosize type="scroll">
        <TabsList>
          <Group wrap="nowrap">
            <TabItem value="similar">Similar cards</TabItem>
            {featureFlags?.connections && (
              <TabItem value="connections" count={stats?.connections.all.total}>
                Connections
              </TabItem>
            )}
            <TabItem value="notes" count={stats?.noteCount}>
              Notes
            </TabItem>
            <TabItem value="collections" count={stats?.collectionCount}>
              Collections
            </TabItem>
            <TabItem value="addedBy" count={stats?.libraryCount}>
              Added by
            </TabItem>
            <TabItem value="mentions">Mentions</TabItem>
          </Group>
        </TabsList>
      </ScrollAreaAutosize>

      <Box mt="md">
        <TabsPanel value="notes">
          <Suspense fallback={<SembleNotesContainerSkeleton />}>
            <SembleNotesContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="collections">
          <Suspense fallback={<SembleCollectionsContainerSkeleton />}>
            <SembleCollectionsContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="addedBy">
          <Suspense fallback={<SembleLibrariesContainerSkeleton />}>
            <SembleLibrariesContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="similar">
          <Suspense fallback={<SembleSimilarCardsContainerSkeleton />}>
            <SembleSimilarCardsContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        {featureFlags?.connections && (
          <TabsPanel value="connections">
            <Suspense fallback={<SembleConnectionsContainerSkeleton />}>
              <SembleConnectionsContainer url={props.url} />
            </Suspense>
          </TabsPanel>
        )}

        <TabsPanel value="mentions">
          <Suspense fallback={<SembleMentionsContainerSkeleton />}>
            <SembleMentionsContainer url={props.url} />
          </Suspense>
        </TabsPanel>
      </Box>
    </Tabs>
  );
}
