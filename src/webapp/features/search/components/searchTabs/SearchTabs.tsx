'use client';

import { Tabs, Stack, Scroller, TabsList, Group } from '@mantine/core';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import SearchBar from '../searchBar/SearchBar';
import SearchTabItem from '../searchTabItem/SearchTabItem';
import { useSearchParams, usePathname } from 'next/navigation';

export default function SearchTabs() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const query = searchParams.get('query') || '';

  // Derived from the pathname on every render, so browser back/forward and any
  // navigation that doesn't originate from a tab click stay in sync.
  const activeTab = pathname.includes('/collections')
    ? 'collections'
    : pathname.includes('/profiles')
      ? 'profiles'
      : 'cards';

  const buildTabHref = (tabValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return `/search/${tabValue}${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <Tabs value={activeTab} keepMounted={false}>
      <Stack gap="xs">
        {/* remount on query change so the input never shows a stale value */}
        <SearchBar key={query} query={query} />

        <TabsList>
          <Scroller>
            <Group gap={0} wrap="nowrap">
              <SearchTabItem
                value="cards"
                label="Cards"
                href={buildTabHref('cards')}
                icon={<FaRegNoteSticky />}
              />
              <SearchTabItem
                value="collections"
                label="Collections"
                href={buildTabHref('collections')}
                icon={<BiCollection />}
              />
              <SearchTabItem
                value="profiles"
                label="Profiles"
                href={buildTabHref('profiles')}
                icon={<MdOutlinePeopleAlt />}
              />
            </Group>
          </Scroller>
        </TabsList>
      </Stack>
    </Tabs>
  );
}
