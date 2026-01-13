'use client';

import { useState } from 'react';
import { Container, Stack, TextInput, Button, Group } from '@mantine/core';
import { BiSearch } from 'react-icons/bi';
import SearchResultsContainer from '../searchResultsContainer/SearchResultsContainer';

export default function SearchContainer() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Container p="xs" size="xl">
      <Stack gap="lg">
        <Group gap="xs">
          <TextInput
            flex={1}
            placeholder="Search for cards..."
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyPress={handleKeyPress}
            leftSection={<BiSearch size={16} />}
          />
          <Button onClick={handleSearch} disabled={!query.trim()}>
            Search
          </Button>
        </Group>

        {searchQuery && <SearchResultsContainer query={searchQuery} />}
      </Stack>
    </Container>
  );
}
