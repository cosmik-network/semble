'use client';

import { ActionIcon, Card, CloseButton, Group, TextInput } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Props {
  query?: string;
}

export default function SearchBar(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [search, setSearch] = useState(props.query ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const searchType = pathname.includes('/collections')
    ? 'collections'
    : pathname.includes('/profiles')
      ? 'profiles'
      : pathname.includes('/cards')
        ? 'cards'
        : null;

  const getPlaceholderText = () => {
    const handle = searchParams.get('handle');

    return !searchType
      ? 'Find cards, collections, and more'
      : handle && ['cards', 'collections'].includes(searchType)
        ? `Search for @${handle}'s ${searchType}`
        : `Search for ${searchType.toLowerCase()}`;
  };

  const onSearch = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (search) {
      params.set('query', search);
    } else {
      params.delete('query');
    }

    startTransition(() => router.push(`?${params.toString()}`));
  };

  return (
    <Card pr="6" py="6" radius="lg" w="100%" withBorder>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (search) onSearch();
        }}
      >
        <Group gap="xs" justify="space-between" wrap="nowrap" w="100%">
          <TextInput
            ref={inputRef}
            variant="unstyled"
            placeholder={getPlaceholderText()}
            flex={1}
            size="md"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={
              <CloseButton
                radius="xl"
                aria-label="Clear input"
                style={{ display: search ? undefined : 'none' }}
                onMouseDown={(e) => {
                  e.preventDefault(); // don't blur
                }}
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus(); // refocus
                }}
              />
            }
          />
          <ActionIcon
            type="submit"
            size="lg"
            radius="xl"
            disabled={!search}
            loading={isPending}
            onClick={() => {
              track('Search: search button clicked');
              posthog.capture('Search: search button clicked');
            }}
          >
            <IoSearch size={20} />
          </ActionIcon>
        </Group>
      </form>
    </Card>
  );
}
