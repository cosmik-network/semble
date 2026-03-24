'use client';

import { useState, Suspense } from 'react';
import {
  Box,
  ScrollAreaAutosize,
  Tabs,
  TabsList,
  TabsPanel,
} from '@mantine/core';
import TabItem from './TabItem';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
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

import UrlGraphView from '@/features/graph/components/graphView/UrlGraphView';

interface Props {
  url: string;
}

type TabValue =
  | 'notes'
  | 'collections'
  | 'addedBy'
  | 'similar'
  | 'connections'
  | 'graph';

export default function SembleTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('similar');
  const { data: featureFlags } = useFeatureFlags();
  const { data: urlMetadata } = useUrlMetadata({
    url: props.url,
    includeStats: true,
  });

  const stats = urlMetadata?.stats;

  return (
    <Tabs
      keepMounted={false}
      value={activeTab}
      onChange={(val) => setActiveTab(val as TabValue)}
    >
      <ScrollAreaAutosize type="scroll">
        <TabsList style={{ flexWrap: 'nowrap' }}>
          <TabItem value="similar">Similar cards</TabItem>
          <TabItem value="connections" count={stats?.connections.all.total}>
            Connections
          </TabItem>
          {featureFlags?.graphView && <TabItem value="graph">Graph</TabItem>}
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
        </TabsList>
      </ScrollAreaAutosize>

      <Box mt="md">
        <TabsPanel value="notes">
          <Suspense fallback={<SembleNotesContainerSkeleton />} key={props.url}>
            <SembleNotesContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="collections">
          <Suspense
            fallback={<SembleCollectionsContainerSkeleton />}
            key={props.url}
          >
            <SembleCollectionsContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="addedBy">
          <Suspense
            fallback={<SembleLibrariesContainerSkeleton />}
            key={props.url}
          >
            <SembleLibrariesContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="similar">
          <Suspense
            fallback={<SembleSimilarCardsContainerSkeleton />}
            key={props.url}
          >
            <SembleSimilarCardsContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        <TabsPanel value="connections">
          <Suspense
            fallback={<SembleConnectionsContainerSkeleton />}
            key={props.url}
          >
            <SembleConnectionsContainer url={props.url} />
          </Suspense>
        </TabsPanel>

        {featureFlags?.graphView && (
          <TabsPanel value="graph">
            <UrlGraphView url={props.url} />
          </TabsPanel>
        )}

        <TabsPanel value="mentions">
          <Suspense
            fallback={<SembleMentionsContainerSkeleton />}
            key={props.url}
          >
            <SembleMentionsContainer url={props.url} />
          </Suspense>
        </TabsPanel>
      </Box>
    </Tabs>
  );
}
