'use client';

import {
  ActionIcon,
  Card,
  Group,
  Select,
  SelectProps,
  Stack,
  TextInput,
} from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { BiCollection } from 'react-icons/bi';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import { SearchFilters } from '../searchFilters/SearchFilters';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

const icons: Record<string, React.ReactNode> = {
  cards: <FaRegNoteSticky />,
  collections: <BiCollection />,
  profiles: <MdOutlinePeopleAlt />,
};

const renderSelectOption: SelectProps['renderOption'] = ({ option }) => (
  <Group flex={1} gap="xs">
    {icons[option.value]}
    {option.label}
  </Group>
);

export default function ExpandedSearchBar() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState<string | null>('cards');

  const getPlaceholderText = () => {
    if (!searchType) return 'Find cards, collections, and more';

    return `Search for ${searchType.toLowerCase()}`;
  };

  const onSearch = () => {
    const params = new URLSearchParams();

    if (search) {
      params.set('query', search);
    }

    // build route based on selected type
    const route = `/search/${searchType}`;
    const queryString = params.toString();
    const url = queryString ? `${route}?${queryString}` : route;

    startTransition(() => router.push(url));
  };

  return (
    <Card p={'xs'} radius="lg" w="100%" withBorder>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (search) onSearch();
        }}
      >
        <Stack justify="space-between">
          <TextInput
            autoFocus
            aria-label="Search"
            variant="unstyled"
            placeholder={getPlaceholderText()}
            flex={1}
            size="md"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Group gap={'xs'} justify="space-between">
            <Group gap={'xs'}>
              <Select
                variant="filled"
                allowDeselect={false}
                value={searchType}
                onChange={setSearchType}
                data={[
                  { value: 'cards', label: 'Cards' },
                  { value: 'collections', label: 'Collections' },
                  { value: 'profiles', label: 'Profiles' },
                ]}
                renderOption={renderSelectOption}
                leftSection={searchType ? icons[searchType] : null}
                w={140}
              />
              {searchType !== 'profiles' && (
                <SearchFilters.Root
                  trigger={
                    <ActionIcon
                      variant="light"
                      color="gray"
                      size={36}
                      radius="md"
                    >
                      <TbAdjustmentsHorizontal size={16} />
                    </ActionIcon>
                  }
                >
                  <SearchFilters.ProfileFilter />
                  {searchType === 'cards' && <SearchFilters.UrlTypeFilter />}
                  {searchType === 'collections' && (
                    <SearchFilters.AccessTypeFilter />
                  )}
                  <SearchFilters.Actions />
                </SearchFilters.Root>
              )}
            </Group>

            <ActionIcon
              type="submit"
              size="xl"
              radius="xl"
              disabled={!search}
              loading={isPending}
              onClick={() => {
                track('Search: search button clicked');
                posthog.capture('Search: search button clicked');
              }}
            >
              <IoSearch size={24} />
            </ActionIcon>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
