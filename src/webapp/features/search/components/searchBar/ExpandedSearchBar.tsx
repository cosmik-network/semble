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
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { BiCollection } from 'react-icons/bi';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import { SearchFilters } from '../searchFilters/SearchFilters';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';

interface Props {
  query?: string;
}

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

export default function SearchBar(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(props.query ?? '');
  const [searchType, setSearchType] = useState<string | null>('cards');
  const inputRef = useRef<HTMLInputElement>(null);

  const onSearch = () => {
    const params = new URLSearchParams();

    if (search) {
      params.set('query', search);
    }

    // preserve handle and urlType if they exist for cards
    if (searchType === 'cards') {
      const handle = searchParams.get('handle');
      const urlType = searchParams.get('urlType');
      if (handle) params.set('handle', handle);
      if (urlType) params.set('urlType', urlType);
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
        onSubmit={(e) => {
          e.preventDefault();
          if (search) onSearch();
        }}
      >
        <Stack justify="space-between">
          <TextInput
            ref={inputRef}
            variant="unstyled"
            placeholder="Find cards, collections, and more"
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
              {searchType === 'cards' && (
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
                  <SearchFilters.UrlTypeFilter />
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
            >
              <IoSearch size={24} />
            </ActionIcon>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
