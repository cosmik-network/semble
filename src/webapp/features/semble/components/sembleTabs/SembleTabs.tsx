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

interface Props {
  url: string;
}

type TabValue = 'notes' | 'collections' | 'addedBy' | 'similar';

export default function SembleTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('similar');

  return (
    <Tabs value={activeTab} onChange={(val) => setActiveTab(val as TabValue)}>
      <ScrollAreaAutosize type="scroll">
        <TabsList>
          <Group wrap="nowrap">
            <TabItem value="similar">Similar cards</TabItem>
            <TabItem value="notes">Notes</TabItem>
            <TabItem value="collections">Collections</TabItem>
            <TabItem value="addedBy">Added by</TabItem>
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

        <TabsPanel value="mentions">
          <Suspense fallback={<SembleMentionsContainerSkeleton />}>
            <SembleMentionsContainer url={props.url} />
          </Suspense>
        </TabsPanel>
      </Box>
    </Tabs>
  );
}
