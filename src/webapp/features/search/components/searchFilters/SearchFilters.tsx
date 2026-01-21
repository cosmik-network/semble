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
  Box,
  Indicator,
  Container,
  Combobox,
  useCombobox,
} from '@mantine/core';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';
import { useDebouncedValue, upperFirst } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useState, ReactNode } from 'react';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import { UrlType } from '@semble/types';
import { getUrlTypeIcon } from '@/lib/utils/icon';

// context
interface FilterContextValue {
  opened: boolean;
  setOpened: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedHandle: string;
  setSelectedHandle: (val: string) => void;
  localType: UrlType | null;
  setLocalType: (val: UrlType | null) => void;
  appliedHandle: string;
  appliedType: UrlType | null;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const useFilterContext = () => {
  const ctx = useContext(FilterContext);
  if (!ctx)
    throw new Error(
      'SearchFilter components must be wrapped in SearchFilter.Root',
    );
  return ctx;
};

// root
export function Root(props: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const searchParams = useSearchParams();

  const appliedHandle = searchParams.get('handle') ?? '';
  const appliedType = searchParams.get('urlType') as UrlType | null;

  const [searchQuery, setSearchQuery] = useState(appliedHandle);
  const [selectedHandle, setSelectedHandle] = useState(appliedHandle);
  const [localType, setLocalType] = useState<UrlType | null>(appliedType);

  const handleOpen = () => {
    setSearchQuery(appliedHandle);
    setSelectedHandle(appliedHandle);
    setLocalType(appliedType);
    setOpened(true);
  };

  const hasFilters = !!appliedHandle || !!appliedType;

  return (
    <FilterContext.Provider
      value={{
        opened,
        setOpened,
        searchQuery,
        setSearchQuery,
        selectedHandle,
        setSelectedHandle,
        localType,
        setLocalType,
        appliedHandle,
        appliedType,
      }}
    >
      <Indicator offset={4} disabled={!hasFilters} zIndex={0}>
        <ActionIcon
          variant="light"
          color="gray"
          size="xl"
          radius="lg"
          onClick={handleOpen}
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
        overlayProps={UPDATE_OVERLAY_PROPS}
        trapFocus={false}
      >
        <Drawer.Header>
          <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
            Filters
          </Drawer.Title>
        </Drawer.Header>
        <Container size={'xs'} p={0}>
          <Stack gap="xl">{props.children}</Stack>
        </Container>
      </Drawer>
    </FilterContext.Provider>
  );
}

// profile filter
export function ProfileFilter() {
  const ctx = useFilterContext();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [debounced] = useDebouncedValue(ctx.searchQuery, 200);

  const {
    data: actors = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['bluesky user search', debounced],
    queryFn: () => searchBlueskyUsers(debounced),
    enabled: debounced.trim().length > 0,
  });

  const options = actors.map((user) => (
    <Combobox.Option key={user.did} value={user.handle} p={5}>
      <Group gap="xs" wrap="nowrap">
        <Avatar
          src={user.avatar?.replace('avatar', 'avatar_thumbnail')}
          alt={user.handle}
        />
        <Stack gap={0}>
          <Text fw={500} lineClamp={1}>
            {user.displayName || user.handle}
          </Text>
          <Text fw={500} size="sm" c="dimmed" lineClamp={1}>
            @{user.handle}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        ctx.setSelectedHandle(val);
        ctx.setSearchQuery(val);
        combobox.closeDropdown();
      }}
      position="bottom"
      middlewares={{ flip: false, shift: true }}
    >
      <Combobox.Target>
        <TextInput
          label="User"
          variant="filled"
          size="md"
          placeholder="Search for handle"
          value={ctx.searchQuery}
          onChange={(e) => {
            ctx.setSearchQuery(e.currentTarget.value);
            if (ctx.selectedHandle) ctx.setSelectedHandle('');
            combobox.openDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            ctx.setSearchQuery(ctx.selectedHandle);
          }}
          leftSection={<MdOutlineAlternateEmail size={18} />}
          rightSection={
            isFetching ? (
              <Loader size={16} />
            ) : (
              ctx.searchQuery && (
                <CloseButton
                  onClick={() => {
                    ctx.setSearchQuery('');
                    ctx.setSelectedHandle('');
                  }}
                />
              )
            )
          }
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={debounced.trim().length === 0}>
        <Combobox.Options>
          <ScrollArea.Autosize type="scroll" mah={200}>
            {isFetching && <Combobox.Empty>Searching...</Combobox.Empty>}
            {error && <Combobox.Empty>Error fetching profiles</Combobox.Empty>}
            {!isFetching && actors.length === 0 && (
              <Combobox.Empty>No profiles found</Combobox.Empty>
            )}
            {options}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

// url type filter
export function UrlTypeFilter() {
  const ctx = useFilterContext();

  return (
    <Box>
      <Text fw={500} mb="xs">
        Content type
      </Text>
      <ScrollArea scrollbars="x" offsetScrollbars={false} scrollbarSize={0}>
        <Group gap={8} wrap="nowrap" pb="xs">
          <Button
            size="sm"
            color="lime"
            radius="xl"
            style={{ flexShrink: 0 }}
            variant={ctx.localType === null ? 'filled' : 'light'}
            onClick={() => ctx.setLocalType(null)}
          >
            All Cards
          </Button>
          {Object.values(UrlType).map((type) => {
            const Icon = getUrlTypeIcon(type);
            return (
              <Button
                key={type}
                size="sm"
                color="lime"
                radius="xl"
                style={{ flexShrink: 0 }}
                variant={ctx.localType === type ? 'filled' : 'light'}
                leftSection={<Icon size={14} />}
                onClick={() => ctx.setLocalType(type)}
              >
                {upperFirst(type)}
              </Button>
            );
          })}
        </Group>
      </ScrollArea>
    </Box>
  );
}

// actions
export function Actions() {
  const ctx = useFilterContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasAnyActiveFilters =
    !!ctx.appliedHandle ||
    !!ctx.appliedType ||
    !!ctx.selectedHandle ||
    ctx.localType !== null;

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (ctx.selectedHandle) params.set('handle', ctx.selectedHandle);
    else params.delete('handle');

    if (ctx.localType) params.set('urlType', ctx.localType);
    else params.delete('urlType');

    router.replace(`?${params.toString()}`, { scroll: false });
    ctx.setOpened(false);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('handle');
    params.delete('urlType');

    ctx.setSearchQuery('');
    ctx.setSelectedHandle('');
    ctx.setLocalType(null);
    ctx.setOpened(false);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const isInvalid = ctx.searchQuery !== ctx.selectedHandle;

  return (
    <Stack gap="sm" mt="md">
      <Group justify="space-between" gap={'xs'} grow>
        <Button
          variant="light"
          color="gray"
          onClick={() => ctx.setOpened(false)}
        >
          Cancel
        </Button>

        {hasAnyActiveFilters && (
          <Button variant="light" color="red" onClick={handleClear}>
            Clear all
          </Button>
        )}

        <Button variant="filled" onClick={handleApply} disabled={isInvalid}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
}

export const SearchFilters = { Root, ProfileFilter, UrlTypeFilter, Actions };
