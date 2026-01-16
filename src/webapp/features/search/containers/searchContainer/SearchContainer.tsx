'use client';

import {
  BackgroundImage,
  Button,
  Center,
  Container,
  Group,
  Stack,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import SearchBar from '../../components/searchBar/SearchBar';
import Link from 'next/link';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { BiCollection } from 'react-icons/bi';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';

export default function SearchContainer() {
  const { colorScheme } = useMantineColorScheme();
  const bgSrc = colorScheme === 'dark' ? DarkBG.src : BG.src;

  return (
    <BackgroundImage src={bgSrc} h="75svh" top={0} left={0}>
      <Container p="xs" size="xl">
        <Center h={'75svh'}>
          <Stack align="center" maw={600} w={'100%'}>
            <Title order={2}>Let's find something great</Title>
            <SearchBar />

            <Group gap={'xs'}>
              <Button
                component={Link}
                href={'explore'}
                variant="light"
                color="blue"
                leftSection={<MdOutlineEmojiNature size={18} />}
              >
                Explore
              </Button>
              <Button
                component={Link}
                href="/explore/gems-of-2025/collections"
                size="sm"
                variant="light"
                color={'grape'}
                leftSection={<BiCollection size={18} />}
              >
                Gem Collections
              </Button>
            </Group>
          </Stack>
        </Center>
      </Container>
    </BackgroundImage>
  );
}

// 'use client';

// import { useState } from 'react';
// import {
//   Container,
//   Stack,
//   TextInput,
//   Button,
//   Group,
//   SegmentedControl,
//   Combobox,
//   Loader,
//   Avatar,
//   Text,
//   ScrollArea,
// } from '@mantine/core';
// import { useCombobox } from '@mantine/core';
// import { useDebouncedValue } from '@mantine/hooks';
// import { useQuery } from '@tanstack/react-query';
// import { useRouter } from 'next/navigation';
// import { BiSearch } from 'react-icons/bi';
// import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';
// import SearchResultsContainer from '../searchResultsContainer/SearchResultsContainer';
// import ProfileSearchResultsContainer from '../profileSearchResultsContainer/ProfileSearchResultsContainer';
// import UserFilterCombobox from '../../components/userFilterCombobox/UserFilterCombobox';
// import type { ProfileViewBasic } from '@atproto/api/dist/client/types/app/bsky/actor/defs';

// type SearchType = 'cards' | 'profiles';

// export default function SearchContainer() {
//   const router = useRouter();
//   const [query, setQuery] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchType, setSearchType] = useState<SearchType>('cards');
//   const [selectedUser, setSelectedUser] = useState<ProfileViewBasic | null>(
//     null,
//   );
//   const [searchUserId, setSearchUserId] = useState<string | undefined>(
//     undefined,
//   );

//   // Profile search combobox
//   const combobox = useCombobox({
//     onDropdownClose: () => combobox.resetSelectedOption(),
//   });
//   const [debounced] = useDebouncedValue(query, 200);

//   const {
//     data: profileSuggestions = [],
//     isFetching: isProfileSearching,
//     error: profileSearchError,
//   } = useQuery({
//     queryKey: ['profile search suggestions', debounced],
//     queryFn: () => searchBlueskyUsers(debounced),
//     enabled: searchType === 'profiles' && debounced.trim().length > 0,
//   });

//   const handleSearch = () => {
//     if (query.trim()) {
//       setSearchQuery(query.trim());
//       setSearchUserId(searchType === 'cards' ? selectedUser?.did : undefined);
//       if (searchType === 'profiles') {
//         combobox.closeDropdown();
//       }
//     }
//   };

//   const handleKeyPress = (event: React.KeyboardEvent) => {
//     if (event.key === 'Enter') {
//       handleSearch();
//     }
//   };

//   const handleSearchTypeChange = (value: string) => {
//     setSearchType(value as SearchType);
//     setQuery('');
//     setSearchQuery('');
//     // Clear user filter when switching to profile search
//     if (value === 'profiles') {
//       setSelectedUser(null);
//       setSearchUserId(undefined);
//     }
//     combobox.closeDropdown();
//   };

//   const handleProfileSelect = (handle: string) => {
//     const selectedProfile = profileSuggestions.find(
//       (profile) => profile.handle === handle,
//     );
//     if (selectedProfile) {
//       router.push(`/profile/${selectedProfile.handle}`);
//       setQuery('');
//       combobox.closeDropdown();
//     }
//   };

//   const profileOptions = profileSuggestions.map((profile) => (
//     <Combobox.Option key={profile.did} value={profile.handle} p={5}>
//       <Group gap={'xs'} wrap="nowrap">
//         <Avatar
//           src={profile.avatar?.replace('avatar', 'avatar_thumbnail')}
//           alt={`${profile.handle}'s avatar`}
//           size="sm"
//         />
//         <Stack gap={0}>
//           <Text fw={500} c={'bright'} lineClamp={1} size="sm">
//             {profile.displayName || profile.handle}
//           </Text>
//           <Text fw={500} c={'gray'} lineClamp={1} size="xs">
//             @{profile.handle}
//           </Text>
//         </Stack>
//       </Group>
//     </Combobox.Option>
//   ));

//   const showProfileDropdown =
//     searchType === 'profiles' &&
//     debounced.trim().length > 0 &&
//     (profileSuggestions.length > 0 || isProfileSearching || profileSearchError);

//   return (
//     <Container p="xs" size="xl">
//       <Stack gap="lg">
//         <SegmentedControl
//           value={searchType}
//           onChange={handleSearchTypeChange}
//           data={[
//             { label: 'Cards', value: 'cards' },
//             { label: 'Profiles', value: 'profiles' },
//           ]}
//         />

//         <Group gap="xs">
//           {searchType === 'profiles' ? (
//             <Combobox
//               store={combobox}
//               withinPortal={false}
//               onOptionSubmit={handleProfileSelect}
//             >
//               <Combobox.Target>
//                 <TextInput
//                   flex={1}
//                   placeholder="Search for profiles..."
//                   value={query}
//                   onChange={(event) => {
//                     setQuery(event.currentTarget.value);
//                     combobox.openDropdown();
//                   }}
//                   onKeyPress={handleKeyPress}
//                   onFocus={() => combobox.openDropdown()}
//                   onBlur={() => combobox.closeDropdown()}
//                   leftSection={<BiSearch size={16} />}
//                   rightSection={isProfileSearching && <Loader size={16} />}
//                 />
//               </Combobox.Target>

//               <Combobox.Dropdown hidden={!showProfileDropdown}>
//                 <Combobox.Options>
//                   <ScrollArea.Autosize type="scroll" mah={200}>
//                     {isProfileSearching && (
//                       <Combobox.Empty>Searching...</Combobox.Empty>
//                     )}
//                     {profileSearchError && (
//                       <Combobox.Empty>
//                         Could not search for profiles
//                       </Combobox.Empty>
//                     )}
//                     {!isProfileSearching &&
//                       !profileSearchError &&
//                       profileSuggestions.length === 0 && (
//                         <Combobox.Empty>No profiles found</Combobox.Empty>
//                       )}
//                     {profileOptions}
//                   </ScrollArea.Autosize>
//                 </Combobox.Options>
//               </Combobox.Dropdown>
//             </Combobox>
//           ) : (
//             <TextInput
//               flex={1}
//               placeholder="Search for cards..."
//               value={query}
//               onChange={(event) => setQuery(event.currentTarget.value)}
//               onKeyPress={handleKeyPress}
//               leftSection={<BiSearch size={16} />}
//             />
//           )}

//           {searchType === 'cards' && (
//             <UserFilterCombobox
//               selectedUser={selectedUser}
//               onUserSelect={setSelectedUser}
//             />
//           )}

//           <Button onClick={handleSearch} disabled={!query.trim()}>
//             Search
//           </Button>
//         </Group>

//         {searchQuery && searchType === 'cards' && (
//           <SearchResultsContainer query={searchQuery} userId={searchUserId} />
//         )}

//         {searchQuery && searchType === 'profiles' && (
//           <ProfileSearchResultsContainer query={searchQuery} />
//         )}
//       </Stack>
//     </Container>
//   );
// }
