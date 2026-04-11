'use client';

import { Tabs, Stack, Scroller, TabsList, Group } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import SearchBar from '../searchBar/SearchBar';
import SearchTabItem from '../searchTabItem/SearchTabItem';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchTabs() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const query = searchParams.get('query') || '';

  const activeTab = pathname.includes('/collections')
    ? 'collections'
    : pathname.includes('/profiles')
      ? 'profiles'
      : 'cards';

  const [optimisticTab, setOptimisticTab] = useState(activeTab);

  const buildTabHref = (tabValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return `/search/${tabValue}${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <Tabs
      value={optimisticTab}
      keepMounted={false}
      onChange={(value) => {
        if (!value || value === activeTab) return;

        setOptimisticTab(value);
        router.push(buildTabHref(value));
      }}
    >
      <Stack gap="xs">
        <SearchBar query={query} />

        <TabsList>
          <Scroller>
            <Group gap={0} wrap="nowrap">
              <SearchTabItem
                value="cards"
                label="Cards"
                icon={<FaRegNoteSticky />}
              />
              <SearchTabItem
                value="collections"
                label="Collections"
                icon={<BiCollection />}
              />
              <SearchTabItem
                value="profiles"
                label="Profiles"
                icon={<MdOutlinePeopleAlt />}
              />
            </Group>
          </Scroller>
        </TabsList>
      </Stack>
    </Tabs>
  );
}
