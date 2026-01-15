'use client';

import { useState } from 'react';
import {
  Container,
  Stack,
  TextInput,
  Button,
  Group,
  SegmentedControl,
} from '@mantine/core';
import { BiSearch } from 'react-icons/bi';
import SearchResultsContainer from '../searchResultsContainer/SearchResultsContainer';
import ProfileSearchResultsContainer from '../profileSearchResultsContainer/ProfileSearchResultsContainer';
import UserFilterCombobox from '../../components/userFilterCombobox/UserFilterCombobox';
import type { ProfileViewBasic } from '@atproto/api/dist/client/types/app/bsky/actor/defs';

type SearchType = 'cards' | 'profiles';

export default function SearchContainer() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('cards');
  const [selectedUser, setSelectedUser] = useState<ProfileViewBasic | null>(
    null,
  );
  const [searchUserId, setSearchUserId] = useState<string | undefined>(
    undefined,
  );

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      setSearchUserId(searchType === 'cards' ? selectedUser?.did : undefined);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchTypeChange = (value: string) => {
    setSearchType(value as SearchType);
    // Clear user filter when switching to profile search
    if (value === 'profiles') {
      setSelectedUser(null);
      setSearchUserId(undefined);
    }
  };

  return (
    <Container p="xs" size="xl">
      <Stack gap="lg">
        <SegmentedControl
          value={searchType}
          onChange={handleSearchTypeChange}
          data={[
            { label: 'Cards', value: 'cards' },
            { label: 'Profiles', value: 'profiles' },
          ]}
        />

        <Group gap="xs">
          <TextInput
            flex={1}
            placeholder={
              searchType === 'cards'
                ? 'Search for cards...'
                : 'Search for profiles...'
            }
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyPress={handleKeyPress}
            leftSection={<BiSearch size={16} />}
          />
          {searchType === 'cards' && (
            <UserFilterCombobox
              selectedUser={selectedUser}
              onUserSelect={setSelectedUser}
            />
          )}
          <Button onClick={handleSearch} disabled={!query.trim()}>
            Search
          </Button>
        </Group>

        {searchQuery && searchType === 'cards' && (
          <SearchResultsContainer query={searchQuery} userId={searchUserId} />
        )}

        {searchQuery && searchType === 'profiles' && (
          <ProfileSearchResultsContainer query={searchQuery} />
        )}
      </Stack>
    </Container>
  );
}
