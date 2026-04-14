'use client';

import { Group, Paper, Scroller, Tabs } from '@mantine/core';
import { usePathname } from 'next/navigation';
import TabItem from './TabItem';
import ContributorTab from './ContributorTab';

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
        <Tabs.List>
          <Scroller>
            <Group wrap="nowrap">
              <TabItem value="cards" href={basePath}>
                Cards
              </TabItem>
              <TabItem value="similar-cards" href={`${basePath}/similar-cards`}>
                Similar cards
              </TabItem>
              <TabItem value="mentions" href={`${basePath}/mentions`}>
                Mentions
              </TabItem>
              <TabItem value="followers" href={`${basePath}/followers`}>
                Followers
              </TabItem>
              <ContributorTab
                handle={props.handle}
                rkey={props.rkey}
                basePath={basePath}
              />
              {/*<TabItem value="added-by" href={`${basePath}/added-by`}>
                Added by
              </TabItem>*/}
            </Group>
          </Scroller>
        </Tabs.List>
      </Paper>
    </Tabs>
  );
}
