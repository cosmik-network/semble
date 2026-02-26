'use client';

import {
  Stack,
  Text,
  TextInput,
  Button,
  Alert,
  UnstyledButton,
  Combobox,
  Loader,
  Group,
  Avatar,
  ScrollArea,
} from '@mantine/core';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { BiRightArrowAlt } from 'react-icons/bi';
import { useCombobox } from '@mantine/core';
import { useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { UseFormReturnType } from '@mantine/form';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';

interface LoginFormValues {
  handle: string;
  appPassword: string;
  useAppPassword: boolean;
}

type LoginFormType = UseFormReturnType<LoginFormValues>;

interface Props {
  form: LoginFormType;
  error: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToAppPassword: () => void;
}

export default function OAuthLoginForm(props: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [inputValue, setInputValue] = useState(props.form.values.handle);
  const [debounced] = useDebouncedValue(inputValue, 200);

  const {
    data: actors = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['bluesky user search', debounced],
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

  return (
    <Stack gap="xl">
      <form onSubmit={props.onSubmit}>
        <Stack align="center">
          <Combobox
            shadow="sm"
            radius={'md'}
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(handleValue) => {
              props.form.setFieldValue('handle', handleValue);
              setInputValue(handleValue);
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <TextInput
                autoComplete="username"
                label="Handle"
                placeholder="you.bsky.social"
                key={props.form.key('handle')}
                value={inputValue}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setInputValue(val);
                  props.form.setFieldValue('handle', val);
                  combobox.openDropdown();
                }}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                leftSection={<MdOutlineAlternateEmail size={22} />}
                rightSection={isFetching && <Loader size={18} />}
                variant="filled"
                size="lg"
                w="100%"
                required
              />
            </Combobox.Target>

            <Combobox.Dropdown hidden={debounced.trim().length === 0}>
              <Combobox.Options>
                <ScrollArea.Autosize type="scroll" mah={200}>
                  {isFetching && <Combobox.Empty>Searching...</Combobox.Empty>}
                  {error && (
                    <Combobox.Empty>
                      Could not search for profiles
                    </Combobox.Empty>
                  )}
                  {empty && <Combobox.Empty>No profiles found</Combobox.Empty>}
                  {options.length > 0 && options}
                </ScrollArea.Autosize>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          <Button
            type="submit"
            size="lg"
            color="var(--mantine-color-dark-filled)"
            fullWidth
            rightSection={<BiRightArrowAlt size={22} />}
            loading={props.isLoading}
          >
            Log in
          </Button>

          {props.error && <Alert title={props.error} color="red" />}

          <Text fw={500} c="stone">
            Or
          </Text>

          <UnstyledButton fw={500} onClick={props.onSwitchToAppPassword}>
            Use your app password
          </UnstyledButton>
        </Stack>
      </form>
    </Stack>
  );
}
