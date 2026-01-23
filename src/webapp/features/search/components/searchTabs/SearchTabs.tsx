'use client';

import {
  Tabs,
  Stack,
  ScrollAreaAutosize,
  TabsList,
  Group,
} from '@mantine/core';
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
  const handle = searchParams.get('handle') || undefined;
  const urlType = searchParams.get('urlType') || undefined;

  const activeTab = pathname.includes('/collections')
    ? 'collections'
    : pathname.includes('/profiles')
      ? 'profiles'
      : 'cards';

  // build search params for each tab
  const buildTabHref = (tabValue: string) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (handle) params.set('handle', handle);
    if (urlType) params.set('urlType', urlType);

    const route = `/search/${tabValue}`;
    const queryString = params.toString();
    return queryString ? `${route}?${queryString}` : route;
  };

  return (
    <Tabs value={activeTab} keepMounted={false}>
      <Stack gap={'xs'}>
        <SearchBar variant="compact" query={query} />

        <ScrollAreaAutosize type="scroll">
          <TabsList>
            <Group gap={0} wrap="nowrap">
              <SearchTabItem
                value="cards"
                label="Cards"
                icon={<FaRegNoteSticky />}
                href={buildTabHref('cards')}
              />

              <SearchTabItem
                value="collections"
                label="Collections"
                icon={<BiCollection />}
                href={buildTabHref('collections')}
              />

              <SearchTabItem
                value="profiles"
                label="Profiles"
                icon={<MdOutlinePeopleAlt />}
                href={buildTabHref('profiles')}
              />
            </Group>
          </TabsList>
        </ScrollAreaAutosize>
      </Stack>
    </Tabs>
  );
}
