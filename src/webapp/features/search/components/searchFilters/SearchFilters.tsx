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
  Popover,
  Select,
  ThemeIcon,
} from '@mantine/core';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';
import { useDebouncedValue, upperFirst } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useState, ReactNode } from 'react';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import { UrlType, CollectionAccessType } from '@semble/types';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { MdFilterList } from 'react-icons/md';
import { FaSeedling } from 'react-icons/fa6';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

// context
interface FilterContextValue {
  opened: boolean;
  setOpened: (val: boolean) => void;
  handleOpen: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedHandle: string;
  setSelectedHandle: (val: string) => void;
  localType: UrlType | null;
  setLocalType: (val: UrlType | null) => void;
  localAccessType: CollectionAccessType | null;
  setLocalAccessType: (val: CollectionAccessType | null) => void;
  appliedHandle: string;
  appliedType: UrlType | null;
  appliedAccessType: CollectionAccessType | null;
  hasFilters: boolean;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
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
export function Root(props: { children: ReactNode; trigger?: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const appliedHandle = searchParams.get('handle') ?? '';
  const appliedType = searchParams.get('urlType') as UrlType | null;
  const appliedAccessType = searchParams.get(
    'accessType',
  ) as CollectionAccessType | null;

  const [searchQuery, setSearchQuery] = useState(appliedHandle);
  const [selectedHandle, setSelectedHandle] = useState(appliedHandle);
  const [localType, setLocalType] = useState<UrlType | null>(appliedType);
  const [localAccessType, setLocalAccessType] =
    useState<CollectionAccessType | null>(appliedAccessType);

  const handleOpen = () => {
    setSearchQuery(appliedHandle);
    setSelectedHandle(appliedHandle);
    setLocalType(appliedType);
    setLocalAccessType(appliedAccessType);
    setOpened(true);
  };

  const hasFilters = !!appliedHandle || !!appliedType || !!appliedAccessType;

  const defaultTrigger = (
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
    <FilterContext.Provider
      value={{
        opened,
        setOpened,
        handleOpen,
        searchQuery,
        setSearchQuery,
        selectedHandle,
        setSelectedHandle,
        localType,
        setLocalType,
        localAccessType,
        setLocalAccessType,
        appliedHandle,
        appliedType,
        appliedAccessType,
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

// trigger
export function Trigger(props: { children: ReactNode }) {
  const ctx = useFilterContext();

  return (
    <Indicator offset={4} disabled={!ctx.hasFilters} zIndex={0}>
      <Box onClick={ctx.handleOpen} style={{ cursor: 'pointer' }}>
        {props.children}
      </Box>
    </Indicator>
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

// url type filter (with popover)
export function UrlTypeFilter() {
  const ctx = useFilterContext();
  const [opened, setOpened] = useState(false);

  const SelectedIcon =
    ctx.localType === null ? MdFilterList : getUrlTypeIcon(ctx.localType);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="top-start"
      shadow="sm"
    >
      <Popover.Target>
        <Stack gap={0} align="start">
          <Button
            variant="light"
            color="lime"
            leftSection={<SelectedIcon />}
            onClick={() => setOpened((o) => !o)}
          >
            {ctx.localType ? upperFirst(ctx.localType) : 'All Cards'}
          </Button>
        </Stack>
      </Popover.Target>

      <Popover.Dropdown maw={300}>
        <Group gap={6}>
          <Button
            size="xs"
            color="lime"
            variant={ctx.localType === null ? 'filled' : 'light'}
            onClick={() => {
              ctx.setLocalType(null);
              setOpened(false);

              // remove filter immediately
              const params = new URLSearchParams(ctx.searchParams.toString());
              params.delete('urlType');
              ctx.router.replace(`?${params.toString()}`, { scroll: false });
            }}
          >
            All Cards
          </Button>

          {Object.values(UrlType).map((type) => {
            const Icon = getUrlTypeIcon(type);

            return (
              <Button
                key={type}
                size="xs"
                color="lime"
                variant={ctx.localType === type ? 'filled' : 'light'}
                leftSection={<Icon />}
                onClick={() => {
                  ctx.setLocalType(type);
                  setOpened(false);

                  // apply filter immediately
                  const params = new URLSearchParams(
                    ctx.searchParams.toString(),
                  );
                  params.set('urlType', type);
                  ctx.router.replace(`?${params.toString()}`, {
                    scroll: false,
                  });
                }}
              >
                {upperFirst(type)}
              </Button>
            );
          })}
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

// access type filter
export function AccessTypeFilter() {
  const ctx = useFilterContext();
  const { data: featureFlags } = useFeatureFlags();

  if (featureFlags?.openCollections) return null;

  return (
    <Select
      variant="filled"
      size="md"
      label="Collection Type"
      placeholder="All"
      clearable
      leftSection={
        ctx.localAccessType === CollectionAccessType.OPEN ? (
          <ThemeIcon size={'md'} variant="light" color={'green'} radius={'xl'}>
            <FaSeedling size={14} />
          </ThemeIcon>
        ) : null
      }
      value={ctx.localAccessType}
      onChange={(value) => {
        const newValue = value as CollectionAccessType | null;
        ctx.setLocalAccessType(newValue);

        const params = new URLSearchParams(ctx.searchParams.toString());
        if (newValue) {
          params.set('accessType', newValue);
        } else {
          params.delete('accessType');
        }
        ctx.router.replace(`?${params.toString()}`, { scroll: false });
      }}
      data={[
        {
          value: CollectionAccessType.CLOSED,
          label: 'Closed',
        },
        {
          value: CollectionAccessType.OPEN,
          label: 'Open',
        },
      ]}
    />
  );
}

// actions
export function Actions() {
  const ctx = useFilterContext();

  const hasAnyActiveFilters =
    !!ctx.appliedHandle ||
    !!ctx.appliedType ||
    !!ctx.selectedHandle ||
    ctx.localType !== null ||
    ctx.localAccessType !== null;

  const handleClear = () => {
    const params = new URLSearchParams(ctx.searchParams.toString());
    params.delete('handle');
    params.delete('urlType');
    params.delete('accessType');

    ctx.setSearchQuery('');
    ctx.setSelectedHandle('');
    ctx.setLocalType(null);
    ctx.setLocalAccessType(null);

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

export const SearchFilters = {
  Root,
  Trigger,
  ProfileFilter,
  UrlTypeFilter,
  AccessTypeFilter,
  Actions,
};
