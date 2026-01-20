'use client';

import { Button, Card, Group, TextInput } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  variant?: 'compact' | 'large';
  query?: string;
}

export default function SearchBar(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');

  const onSearch = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (search) {
      params.set('query', search);
    } else {
      params.delete('query');
    }

    router.push(`?${params.toString()}`);
  };

  if (props.variant === 'compact') {
    return (
      <Card px="6" py="2" radius="xl" w="100%" withBorder>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search) onSearch();
          }}
        >
          <Group gap="xs" justify="space-between" w="100%">
            <TextInput
              variant="unstyled"
              placeholder={'Find cards, collections, and more'}
              flex={1}
              miw={200}
              size="md"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <Button
              type="submit"
              rightSection={<IoSearch />}
              disabled={!search}
            >
              Search
            </Button>
          </Group>
        </form>
      </Card>
    );
  }

  return (
    <Card px="8" py="6" radius="xl" w="100%" withBorder>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (search) onSearch();
        }}
      >
        <Group gap="xs" justify="space-between" w="100%">
          <TextInput
            variant="unstyled"
            placeholder="Find cards, collections, and more"
            flex={1}
            miw={200}
            size="md"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Button type="submit" rightSection={<IoSearch />} disabled={!search}>
            Search
          </Button>
        </Group>
      </form>
    </Card>
  );
}
