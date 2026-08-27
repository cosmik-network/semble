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
  Select,
} from '@mantine/core';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { createContext, use, useState, ReactNode } from 'react';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import { TaggedItemType } from '@semble/types';

// context
interface FilterContextValue {
  opened: boolean;
  setOpened: (val: boolean) => void;
  handleOpen: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedHandle: string;
  setSelectedHandle: (val: string) => void;
  localItemType: TaggedItemType | null;
  setLocalItemType: (val: TaggedItemType | null) => void;
  appliedHandle: string;
  appliedItemType: TaggedItemType | null;
  hasFilters: boolean;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const useFilterContext = () => {
  const ctx = use(FilterContext);
  if (!ctx)
    throw new Error('TagFilter components must be wrapped in TagFilters.Root');
  return ctx;
};

// root
export function Root(props: { children: ReactNode; trigger?: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const appliedHandle = searchParams.get('handle') ?? '';
  const appliedItemType = searchParams.get('itemType') as TaggedItemType | null;

  const [searchQuery, setSearchQuery] = useState(appliedHandle);
  const [selectedHandle, setSelectedHandle] = useState(appliedHandle);
  const [localItemType, setLocalItemType] = useState<TaggedItemType | null>(
    appliedItemType,
  );

  const handleOpen = () => {
    setSearchQuery(appliedHandle);
    setSelectedHandle(appliedHandle);
    setLocalItemType(appliedItemType);
    setOpened(true);
  };

  const hasFilters = !!appliedHandle || !!appliedItemType;

  const defaultTrigger = (
    <Indicator offset={4} disabled={!hasFilters} zIndex={0}>
      <ActionIcon variant="light" color="gray" size="lg" onClick={handleOpen}>
        <TbAdjustmentsHorizontal size={18} />
      </ActionIcon>
    </Indicator>
  );

  const customTrigger = props.trigger ? (
    <Indicator offset={2} disabled={!hasFilters} zIndex={0}>
      <Box
        onClick={handleOpen}
        style={{ cursor: 'pointer', display: 'inline-block' }}
      >
        {props.trigger}
      </Box>
    </Indicator>
  ) : null;

  return (
    <FilterContext
      value={{
        opened,
        setOpened,
        handleOpen,
        searchQuery,
        setSearchQuery,
        selectedHandle,
        setSelectedHandle,
        localItemType,
        setLocalItemType,
        appliedHandle,
        appliedItemType,
        hasFilters,
        router,
        searchParams,
      }}
    >
      {customTrigger ?? defaultTrigger}

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="bottom"
        padding={'sm'}
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
    </FilterContext>
  );
}

// item type filter
export function ItemTypeFilter() {
  const ctx = useFilterContext();

  return (
    <Select
      variant="filled"
      size="md"
      label="Item Type"
      placeholder="All"
      clearable
      value={ctx.localItemType}
      onChange={(value) => {
        const newValue = value as TaggedItemType | null;
        ctx.setLocalItemType(newValue);

        const params = new URLSearchParams(ctx.searchParams.toString());
        if (newValue) {
          params.set('itemType', newValue);
        } else {
          params.delete('itemType');
        }
        ctx.router.replace(`?${params.toString()}`, { scroll: false });
      }}
      data={[
        { value: 'card', label: 'Cards' },
        { value: 'connection', label: 'Connections' },
        { value: 'collection', label: 'Collections' },
      ]}
    />
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

        // apply filter immediately
        const params = new URLSearchParams(ctx.searchParams.toString());
        params.set('handle', val);
        ctx.router.replace(`?${params.toString()}`, { scroll: false });
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

                    // remove filter immediately
                    const params = new URLSearchParams(
                      ctx.searchParams.toString(),
                    );
                    params.delete('handle');
                    ctx.router.replace(`?${params.toString()}`, {
                      scroll: false,
                    });
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

// actions
export function Actions() {
  const ctx = useFilterContext();

  const hasAnyActiveFilters =
    !!ctx.appliedHandle ||
    !!ctx.appliedItemType ||
    !!ctx.selectedHandle ||
    ctx.localItemType !== null;

  const handleClear = () => {
    const params = new URLSearchParams(ctx.searchParams.toString());
    params.delete('handle');
    params.delete('itemType');

    ctx.setSearchQuery('');
    ctx.setSelectedHandle('');
    ctx.setLocalItemType(null);

    ctx.router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Stack gap="sm" mt="md">
      <Group justify="space-between" gap={'xs'} grow>
        <Button
          variant="light"
          size="md"
          color="gray"
          onClick={() => ctx.setOpened(false)}
        >
          Cancel
        </Button>
        {hasAnyActiveFilters && (
          <Button variant="light" size="md" color="red" onClick={handleClear}>
            Clear all
          </Button>
        )}

        <Button variant="filled" size="md" onClick={() => ctx.setOpened(false)}>
          Done
        </Button>
      </Group>
    </Stack>
  );
}

export const TagFilters = {
  Root,
  ItemTypeFilter,
  ProfileFilter,
  Actions,
};
