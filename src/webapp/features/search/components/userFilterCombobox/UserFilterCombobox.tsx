'use client';

import {
  Combobox,
  TextInput,
  Loader,
  Group,
  Avatar,
  Stack,
  Text,
  ScrollArea,
  Button,
} from '@mantine/core';
import { useCombobox } from '@mantine/core';
import { useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';
import { MdOutlinePersonSearch, MdClear } from 'react-icons/md';
import type { ProfileViewBasic } from '@atproto/api/dist/client/types/app/bsky/actor/defs';

interface Props {
  selectedUser: ProfileViewBasic | null;
  onUserSelect: (user: ProfileViewBasic | null) => void;
}

export default function UserFilterCombobox(props: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [inputValue, setInputValue] = useState('');
  const [debounced] = useDebouncedValue(inputValue, 200);

  const {
    data: actors = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['bluesky user search filter', debounced],
    queryFn: () => searchBlueskyUsers(debounced),
    enabled: debounced.trim().length > 0,
  });

  const suggestions = actors;
  const empty =
    !error &&
    !isFetching &&
    debounced.trim().length > 0 &&
    suggestions.length === 0;

  const options = suggestions.map((user) => (
    <Combobox.Option key={user.did} value={user.handle} p={5}>
      <Group gap={'xs'} wrap="nowrap">
        <Avatar
          src={user.avatar?.replace('avatar', 'avatar_thumbnail')}
          alt={`${user.handle}'s avatar`}
        />
        <Stack gap={0}>
          <Text fw={500} c={'bright'} lineClamp={1}>
            {user.displayName || user.handle}
          </Text>
          <Text fw={500} c={'gray'} lineClamp={1}>
            @{user.handle}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  ));

  const handleClear = () => {
    props.onUserSelect(null);
    setInputValue('');
    combobox.closeDropdown();
  };

  const displayValue = props.selectedUser
    ? `@${props.selectedUser.handle}`
    : inputValue;

  return (
    <Group gap="xs">
      <Combobox
        shadow="sm"
        radius={'md'}
        store={combobox}
        withinPortal={false}
        onOptionSubmit={(handleValue) => {
          const selectedActor = actors.find(
            (actor) => actor.handle === handleValue,
          );
          if (selectedActor) {
            props.onUserSelect(selectedActor);
            setInputValue('');
            combobox.closeDropdown();
          }
        }}
      >
        <Combobox.Target>
          <TextInput
            placeholder="Filter by user..."
            value={displayValue}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setInputValue(val);
              if (
                props.selectedUser &&
                val !== `@${props.selectedUser.handle}`
              ) {
                props.onUserSelect(null);
              }
              combobox.openDropdown();
            }}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            leftSection={<MdOutlinePersonSearch size={16} />}
            rightSection={isFetching && <Loader size={16} />}
            w={200}
          />
        </Combobox.Target>

        <Combobox.Dropdown
          hidden={debounced.trim().length === 0 && !props.selectedUser}
        >
          <Combobox.Options>
            <ScrollArea.Autosize type="scroll" mah={200}>
              {isFetching && <Combobox.Empty>Searching...</Combobox.Empty>}
              {error && (
                <Combobox.Empty>Could not search for profiles</Combobox.Empty>
              )}
              {empty && <Combobox.Empty>No profiles found</Combobox.Empty>}
              {options.length > 0 && options}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      {props.selectedUser && (
        <Button
          variant="subtle"
          size="xs"
          onClick={handleClear}
          leftSection={<MdClear size={14} />}
        >
          Clear
        </Button>
      )}
    </Group>
  );
}
