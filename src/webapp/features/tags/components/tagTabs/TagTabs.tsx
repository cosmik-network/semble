'use client';

import { Group, Scroller, Tabs, TabsList } from '@mantine/core';
import { BiCollection, BiLink } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { usePathname, useSearchParams } from 'next/navigation';
import LinkTab from '@/components/navigation/linkTab/LinkTab';

/** The Cards tab is the base route; every other value is a child segment. */
const DEFAULT_TAB = 'cards';

const TABS = [
  { value: DEFAULT_TAB, label: 'Cards', icon: <FaRegNoteSticky /> },
  { value: 'collections', label: 'Collections', icon: <BiCollection /> },
  { value: 'connections', label: 'Connections', icon: <BiLink /> },
];

interface Props {
  tag: string;
}

export default function TagTabs(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = `/tags/${encodeURIComponent(props.tag)}`;
  const activeTab = pathname.split('/')[3] ?? DEFAULT_TAB;

  const buildTabHref = (value: string) => {
    const path = value === DEFAULT_TAB ? basePath : `${basePath}/${value}`;
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  };

  return (
    <Tabs value={activeTab}>
      <TabsList>
        <Scroller>
          <Group gap={0} wrap="nowrap">
            {TABS.map((tab) => (
              <LinkTab
                key={tab.value}
                value={tab.value}
                href={buildTabHref(tab.value)}
                leftSection={tab.icon}
              >
                {tab.label}
              </LinkTab>
            ))}
          </Group>
        </Scroller>
      </TabsList>
    </Tabs>
  );
}
