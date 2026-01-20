'use client';

import { ActionIcon, Card, CloseButton, Group, TextInput } from '@mantine/core';
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
  const [search, setSearch] = useState(props.query ?? '');

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
        <Group gap="xs" justify="space-between" w="100%">
          <TextInput
            variant="unstyled"
            placeholder={'Find cards, collections, and more'}
            flex={1}
            miw={200}
            size="md"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={
              <CloseButton
                radius={'xl'}
                aria-label="Clear input"
                onClick={() => setSearch('')}
                style={{ display: search ? undefined : 'none' }}
              />
            }
          />
          <ActionIcon
            type="submit"
            size={'lg'}
            radius={'xl'}
            disabled={!search}
          >
            <IoSearch size={20} />
          </ActionIcon>
        </Group>
      </form>
    </Card>
  );
}
