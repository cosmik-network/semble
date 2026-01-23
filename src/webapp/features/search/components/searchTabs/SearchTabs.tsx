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
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { startTransition } from 'react';

export default function SearchTabs() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const query = searchParams.get('query') || '';
  const handle = searchParams.get('handle') || undefined;
  const urlType = searchParams.get('urlType') || undefined;

  const activeTab = pathname.includes('/collections')
    ? 'collections'
    : pathname.includes('/profiles')
      ? 'profiles'
      : 'cards';

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
    <Tabs
      value={activeTab}
      keepMounted={false}
      onChange={(value) => {
        if (!value || value === activeTab) return;

        startTransition(() => {
          router.replace(buildTabHref(value));
        });
      }}
    >
      <Stack gap="xs">
        <SearchBar variant="compact" query={query} />

        <ScrollAreaAutosize type="scroll">
          <TabsList>
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
          </TabsList>
        </ScrollAreaAutosize>
      </Stack>
    </Tabs>
  );
}
