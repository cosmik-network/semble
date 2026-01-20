'use client';

import { Button, Card, Group, TextInput } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  variant?: 'compact' | 'large';
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

  return (
    <Card p="xs" radius="lg" w="100%" withBorder>
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
