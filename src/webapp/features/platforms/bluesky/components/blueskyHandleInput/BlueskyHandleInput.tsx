'use client';

import {
  Avatar,
  Combobox,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { searchBlueskyUsers } from '../../lib/dal';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** An account picked out of the dropdown, by click or by Enter. */
  onSelect: (handle: string) => void;
  rightSection?: ReactNode;
  /** `form.key('handle')`, when the field belongs to a Mantine form. */
  inputKey?: string;
  autoComplete?: string;
  required?: boolean;
}

export default function BlueskyHandleInput(props: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [debounced] = useDebouncedValue(props.value, 200);
  const query = debounced.trim();

  const {
    data: actors = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['bluesky user search', query],
    queryFn: () => searchBlueskyUsers(query),
    enabled: query.length > 0,
  });

  const empty =
    !error && !isFetching && query.length > 0 && actors.length === 0;

  return (
    <Combobox
      shadow="sm"
      radius="md"
      store={combobox}
      onOptionSubmit={(handle) => {
        combobox.closeDropdown();
        props.onSelect(handle);
      }}
    >
      <Combobox.Target>
        <TextInput
          key={props.inputKey}
          label="Handle"
          placeholder="you.bsky.social"
          autoComplete={props.autoComplete}
          required={props.required}
          value={props.value}
          onChange={(e) => {
            props.onChange(e.currentTarget.value);
            combobox.openDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          leftSection={<MdOutlineAlternateEmail size={22} />}
          rightSection={isFetching ? <Loader size={18} /> : props.rightSection}
          variant="filled"
          size="lg"
          w="100%"
          miw={300}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={query.length === 0 || isFetching}>
        <Combobox.Options>
          <ScrollArea.Autosize type="scroll" mah={200}>
            {error && (
              <Combobox.Empty>Could not search for profiles</Combobox.Empty>
            )}
            {empty && <Combobox.Empty>No profiles found</Combobox.Empty>}
            {actors.map((actor) => (
              <Combobox.Option key={actor.did} value={actor.handle} p={5}>
                <Group gap={'xs'} wrap="nowrap">
                  <Avatar
                    src={actor.avatar?.replace('avatar', 'avatar_thumbnail')}
                    alt={`${actor.handle}'s avatar`}
                  />
                  <Stack gap={0}>
                    <Text fw={500} c={'bright'} lineClamp={1}>
                      {actor.displayName || actor.handle}
                    </Text>
                    <Text fw={500} c={'gray'} lineClamp={1}>
                      @{actor.handle}
                    </Text>
                  </Stack>
                </Group>
              </Combobox.Option>
            ))}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
