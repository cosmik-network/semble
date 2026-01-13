'use client';

import { useState } from 'react';
import { Container, Stack, TextInput, Button, Group } from '@mantine/core';
import { BiSearch } from 'react-icons/bi';
import SearchResultsContainer from '../searchResultsContainer/SearchResultsContainer';
import UserFilterCombobox from '../../components/userFilterCombobox/UserFilterCombobox';
import type { ProfileViewBasic } from '@atproto/api/dist/client/types/app/bsky/actor/defs';

export default function SearchContainer() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ProfileViewBasic | null>(null);
  const [searchUserId, setSearchUserId] = useState<string | undefined>(undefined);

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      setSearchUserId(selectedUser?.did);
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
          <UserFilterCombobox
            selectedUser={selectedUser}
            onUserSelect={setSelectedUser}
          />
          <Button onClick={handleSearch} disabled={!query.trim()}>
            Search
          </Button>
        </Group>

        {searchQuery && <SearchResultsContainer query={searchQuery} userId={searchUserId} />}
      </Stack>
    </Container>
  );
}
