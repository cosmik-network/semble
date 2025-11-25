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

import SembleOverviewContainer from '../../containers/sembleOverviewContainer/SembleOverviewContainer';
import SembleOverviewContainerSkeleton from '../../containers/sembleOverviewContainer/Skeleton.SembleOverviewContainer';

import SembleNotesContainer from '../../containers/sembleNotesContainer/SembleNotesContainer';
import SembleNotesContainerSkeleton from '../../containers/sembleNotesContainer/Skeleton.SembleNotesContainer';

import SembleCollectionsContainer from '../../containers/sembleCollectionsContainer/SembleCollectionsContainer';
import SembleCollectionsContainerSkeleton from '../../containers/sembleCollectionsContainer/Skeleton.SembleCollectionsContainer';

import SembleLibrariesContainer from '../../containers/sembleLibrariesContainer/SembleLibrariesContainer';
import SembleLibrariesContainerSkeleton from '../../containers/sembleLibrariesContainer/Skeleton.SembleLibrariesContainer';

import SembleSimilarCardsContainer from '../../containers/sembleSimilarCardsContainer/SembleSimilarCardsContainer';
import SembleSimilarCardsContainerSkeleton from '../../containers/sembleSimilarCardsContainer/Skeleton.SembleSimilarCardsContainer';

interface Props {
  url: string;
}

type TabValue = 'overview' | 'notes' | 'collections' | 'addedBy' | 'similar';

export default function SembleTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  return (
    <Tabs value={activeTab} onChange={(val) => setActiveTab(val as TabValue)}>
      <ScrollAreaAutosize type="scroll">
        <TabsList>
          <Group wrap="nowrap">
            <TabItem value="overview">Overview</TabItem>
            <TabItem value="notes">Notes</TabItem>
            <TabItem value="collections">Collections</TabItem>
            <TabItem value="addedBy">Added by</TabItem>
            <TabItem value="similar">Similar cards</TabItem>
          </Group>
        </TabsList>
      </ScrollAreaAutosize>

      <Box mt="md">
        <TabsPanel value="overview">
          <Suspense fallback={<SembleOverviewContainerSkeleton />}>
            <SembleOverviewContainer url={props.url} onViewTab={setActiveTab} />
          </Suspense>
        </TabsPanel>

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
      </Box>
    </Tabs>
  );
}
