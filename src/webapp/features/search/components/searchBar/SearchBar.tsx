'use client';

import { Button, Card, Group, TextInput } from '@mantine/core';
import { useState } from 'react';
import { IoSearch } from 'react-icons/io5';

export default function SearchBar() {
  const [search, setSearch] = useState('');

  return (
    <Card p={'xs'} radius={'lg'} w={'100%'} withBorder>
      <Group gap={'xs'} justify="space-between" w={'100%'}>
        <TextInput
          variant="unstyled"
          placeholder="Search for cards or profiles"
          flex={1}
          miw={200}
          size="md"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Button rightSection={<IoSearch />} disabled={!search}>
          Search
        </Button>
      </Group>
    </Card>
  );
}
