'use client';

import { Group, ScrollAreaAutosize, Tabs, TabsList } from '@mantine/core';
import TabItem from './TabItem';
import { usePathname } from 'next/navigation';

export default function FeedTabs() {
  const pathname = usePathname();
  const segment = pathname.split('/')[2];
  const currentTab = segment || 'explore'; // treat base route as 'explore'

  return (
    <Tabs value={currentTab}>
      <ScrollAreaAutosize type="scroll">
        <TabsList grow>
          <TabItem value="explore" href="/explore">
            All
          </TabItem>
          <TabItem value="gems-of-2025" href="/explore/gems-of-2025">
            💎 Gems of 2025 💎
          </TabItem>
        </TabsList>
      </ScrollAreaAutosize>
    </Tabs>
  );
}
