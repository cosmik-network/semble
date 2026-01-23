'use client';

import { ActionIcon, Card, CloseButton, Group, TextInput } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

interface Props {
  variant?: 'compact' | 'large';
  query?: string;
}

export default function SearchBar(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(props.query ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

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
    <Card
      pr="6"
      py={props.variant === 'compact' ? '2' : '6'}
      radius="lg"
      w="100%"
      withBorder
    >
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
            placeholder="Find cards, collections, and more"
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
          >
            <IoSearch size={20} />
          </ActionIcon>
        </Group>
      </form>
    </Card>
  );
}
