'use client';

import { Box, Tabs } from '@mantine/core';
import TabItem from './TabItem';
import { Suspense, useState } from 'react';
import SembleNotesContainer from '../../containers/sembleNotesContainer/SembleNotesContainer';
import SembleNotesContainerSkeleton from '../../containers/sembleNotesContainer/Skeleton.SembleNotesContainer';

interface Props {
  url: string;
}

export default function SembleTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<string | null>('notes');

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tabs.List>
        <TabItem value="notes">Notes</TabItem>
        <TabItem value="collections">Collections</TabItem>
        <TabItem value="addedBy">Added by</TabItem>
      </Tabs.List>

      <Box mt={'md'}>
        <Tabs.Panel value="notes">
          <Suspense fallback={<SembleNotesContainerSkeleton />}>
            <SembleNotesContainer url={props.url} />
          </Suspense>
        </Tabs.Panel>
        <Tabs.Panel value="collections">Collections</Tabs.Panel>
        <Tabs.Panel value="Added by">Added by</Tabs.Panel>
      </Box>
    </Tabs>
  );
}
