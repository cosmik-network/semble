'use client';

import {
  Drawer,
  TextInput,
  Loader,
  Group,
  Avatar,
  Stack,
  Text,
  ScrollArea,
  ActionIcon,
  Button,
  CloseButton,
  UnstyledButton,
  Box,
  Indicator,
} from '@mantine/core';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';

export default function UsernameSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialHandle = searchParams.get('handle') ?? '';
  const [opened, setOpened] = useState(false);
  const [inputValue, setInputValue] = useState(initialHandle);
  const [appliedHandle, setAppliedHandle] = useState(initialHandle);

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

  const updateHandleParam = (handle: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (handle) {
      params.set('handle', handle);
    } else {
      params.delete('handle');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
    setAppliedHandle(handle);
  };

  const handleSelect = (handle: string) => {
    setInputValue(handle);
    updateHandleParam(handle);
    setOpened(false);
  };

  const clearFilters = () => {
    setInputValue('');
    updateHandleParam('');
    setOpened(false);
  };

  return (
    <>
      <Indicator offset={4} disabled={!appliedHandle}>
        <ActionIcon
          variant="light"
          color="gray"
          size="xl"
          radius="lg"
          onClick={() => setOpened(true)}
        >
          <TbAdjustmentsHorizontal size={20} />
        </ActionIcon>
      </Indicator>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="bottom"
        padding="md"
        size="sm"
        withCloseButton={false}
      >
        <Group mb="sm" justify="space-between">
          <Text fw={600} size="sm">
            Filters
          </Text>
          <Button
            size="xs"
            variant="light"
            color="red"
            onClick={clearFilters}
            disabled={!appliedHandle}
          >
            Clear all
          </Button>
        </Group>

        <Stack gap="xs">
          <TextInput
            placeholder="Search Bluesky handle"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            leftSection={<MdOutlineAlternateEmail size={18} />}
            rightSection={
              isFetching ? (
                <Loader size={16} />
              ) : (
                inputValue && (
                  <CloseButton
                    aria-label="Clear input"
                    onClick={() => setInputValue('')}
                  />
                )
              )
            }
          />

          {(debounced.trim().length > 0 || isFetching) && (
            <ScrollArea.Autosize mah={200} type="auto" offsetScrollbars>
              <Stack gap={4} py={5}>
                {isFetching && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    Searching…
                  </Text>
                )}

                {!isFetching && actors.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="sm">
                    No profiles found
                  </Text>
                )}

                {error && (
                  <Text size="sm" color="red" ta="center" py="sm">
                    Could not search profiles
                  </Text>
                )}

                {actors.map((user) => (
                  <UnstyledButton
                    key={user.did}
                    onClick={() => handleSelect(user.handle)}
                    component={Box} // Allows for the sx-like hover styling
                    p={5}
                    style={(theme) => ({
                      borderRadius: theme.radius.sm,
                      transition: 'background-color 100ms ease',
                      '&:hover': {
                        backgroundColor: theme.colors.gray[0],
                      },
                    })}
                  >
                    <Group gap="xs" wrap="nowrap">
                      <Avatar
                        src={user.avatar?.replace('avatar', 'avatar_thumbnail')}
                        alt={user.handle}
                      />
                      <Stack gap={0}>
                        <Text fw={500} lineClamp={1}>
                          {user.displayName || user.handle}
                        </Text>
                        <Text size="sm" c="dimmed" lineClamp={1}>
                          @{user.handle}
                        </Text>
                      </Stack>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
