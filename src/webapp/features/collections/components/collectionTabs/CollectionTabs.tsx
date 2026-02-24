'use client';

import { Group, Paper, ScrollAreaAutosize, Tabs } from '@mantine/core';
import { usePathname } from 'next/navigation';
import TabItem from './TabItem';

interface Props {
  handle: string;
  rkey: string;
}

export default function CollectionTabs(props: Props) {
  const pathname = usePathname();
  const segment = pathname.split('/')[5]; // Index 5 is the segment after rkey
  const currentTab = segment || 'cards'; // treat base route as 'cards'
  const basePath = `/profile/${props.handle}/collections/${props.rkey}`;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <ScrollAreaAutosize type="scroll">
          <Tabs.List>
            <Group wrap="nowrap">
              <TabItem value="cards" href={basePath}>
                Cards
              </TabItem>
              <TabItem value="followers" href={`${basePath}/followers`}>
                Followers
              </TabItem>
              <TabItem value="contributors" href={`${basePath}/contributors`}>
                Contributors
              </TabItem>
            </Group>
          </Tabs.List>
        </ScrollAreaAutosize>
      </Paper>
    </Tabs>
  );
}
