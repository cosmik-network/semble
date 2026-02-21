'use client';

import { Group, Paper, ScrollAreaAutosize, Tabs } from '@mantine/core';
import TabItem from './TabItem';
import { usePathname } from 'next/navigation';

interface Props {
  handle: string;
}

export default function ProfileTabs(props: Props) {
  const pathname = usePathname();
  const segment = pathname.split('/')[3];
  const currentTab = segment || 'profile'; // treat base route as 'profile'
  const basePath = `/profile/${props.handle}`;

  return (
    <Tabs value={currentTab}>
      <Paper radius={0}>
        <ScrollAreaAutosize type="scroll">
          <Tabs.List>
            <Group wrap="nowrap">
              <TabItem value="profile" href={basePath}>
                Profile
              </TabItem>
              <TabItem value="cards" href={`${basePath}/cards`}>
                Cards
              </TabItem>
              <TabItem value="collections" href={`${basePath}/collections`}>
                Collections
              </TabItem>
              <TabItem value="community" href={`${basePath}/community`}>
                Community
              </TabItem>
            </Group>
          </Tabs.List>
        </ScrollAreaAutosize>
      </Paper>
    </Tabs>
  );
}
