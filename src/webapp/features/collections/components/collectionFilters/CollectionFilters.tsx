'use client';

import {
  Avatar,
  Box,
  Button,
  CloseButton,
  Loader,
  Menu,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  use,
  useCallback,
  useRef,
  useState,
  ReactNode,
  Fragment,
  KeyboardEvent,
  useOptimistic,
  useTransition,
} from 'react';
import {
  CollectionAccessType,
  CollectionSortField,
  SortOrder,
} from '@semble/types';
import { MdFilterList, MdOutlineAlternateEmail } from 'react-icons/md';
import { BsGrid } from 'react-icons/bs';
import { CiGrid2H } from 'react-icons/ci';
import { IoClose } from 'react-icons/io5';
import { useSettings } from '@/providers/settings';
import { IoMdCheckmark } from 'react-icons/io';
import { searchBlueskyUsers } from '@/features/platforms/bluesky/lib/dal';
import { getCollectionsSortParams } from '../../lib/utils';

/** Every filter these controls can express. All fields optional = "no filter". */
export interface CollectionFilterState {
  sort?: CollectionSortField;
  sortOrder?: SortOrder;
  accessType?: CollectionAccessType;
  author?: string;
}

/** URL param names used by the uncontrolled (search-param backed) mode. */
const PARAMS = {
  sort: 'collectionSort',
  sortOrder: 'collectionSortOrder',
  accessType: 'collectionAccessType',
  author: 'collectionAuthor',
} as const;

// context
interface FilterContextValue {
  value: CollectionFilterState;
  setValue: (patch: Partial<CollectionFilterState>) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const useFilterContext = () => {
  const ctx = use(FilterContext);
  if (!ctx)
    throw new Error(
      'CollectionFilter components must be wrapped in CollectionFiltersRoot',
    );
  return ctx;
};

// shared sort resolution
interface SortOptions {
  showAddedAt?: boolean;
  defaultSort?: CollectionSortField;
}

/**
 * The active sort field. Shared by SortSelect and SortOrderSelect so the two
 * can't disagree about the default — SortOrderSelect derives its own default
 * from whichever field this returns.
 */
function resolveSortField(
  value: CollectionFilterState,
  opts?: SortOptions,
): CollectionSortField {
  return (
    value.sort ??
    opts?.defaultSort ??
    (opts?.showAddedAt
      ? CollectionSortField.ADDED_AT
      : CollectionSortField.UPDATED_AT)
  );
}

// root
interface RootProps {
  children: ReactNode;
  /** Dropdown width; widen it when the author picker is rendered. */
  width?: number | string;
  /** Pass both to drive the filters from local state instead of the URL. */
  value?: CollectionFilterState;
  onChange?: (next: CollectionFilterState) => void;
}

function FiltersShell(props: { width?: number | string; children: ReactNode }) {
  return (
    <Menu shadow="sm">
      <Menu.Target>
        <Button variant="light" color="gray" leftSection={<MdFilterList />}>
          Filters
        </Button>
      </Menu.Target>
      <Menu.Dropdown w={props.width ?? 200}>{props.children}</Menu.Dropdown>
    </Menu>
  );
}

/**
 * Controlled: the caller owns the state, so there's no router involved and no
 * need for useOptimistic — a useState update already paints immediately.
 */
function ControlledRoot(
  props: RootProps & {
    value: CollectionFilterState;
    onChange: (next: CollectionFilterState) => void;
  },
) {
  const { value, onChange } = props;

  const setValue = useCallback(
    (patch: Partial<CollectionFilterState>) => onChange({ ...value, ...patch }),
    [value, onChange],
  );

  return (
    <FilterContext value={{ value, setValue }}>
      <FiltersShell width={props.width}>{props.children}</FiltersShell>
    </FilterContext>
  );
}

/** Uncontrolled: filters live in the URL, as they always have. */
function UrlRoot(props: RootProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const valueFromUrl: CollectionFilterState = {
    sort: (searchParams.get(PARAMS.sort) as CollectionSortField) ?? undefined,
    sortOrder: (searchParams.get(PARAMS.sortOrder) as SortOrder) ?? undefined,
    accessType:
      (searchParams.get(PARAMS.accessType) as CollectionAccessType) ??
      undefined,
    author: searchParams.get(PARAMS.author) ?? undefined,
  };

  const [value, setOptimisticValue] =
    useOptimistic<CollectionFilterState>(valueFromUrl);

  const setValue = (patch: Partial<CollectionFilterState>) => {
    const next = { ...value, ...patch };

    startTransition(() => {
      setOptimisticValue(next);

      const params = new URLSearchParams(searchParams.toString());
      for (const key of Object.keys(PARAMS) as (keyof typeof PARAMS)[]) {
        const entry = next[key];
        if (entry) params.set(PARAMS[key], entry);
        else params.delete(PARAMS[key]);
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <FilterContext value={{ value, setValue }}>
      <FiltersShell width={props.width}>{props.children}</FiltersShell>
    </FilterContext>
  );
}

export function CollectionFiltersRoot(props: RootProps) {
  // Branching on the presence of value/onChange keeps useSearchParams out of
  // the tree entirely for controlled callers, so they don't need a Suspense
  // boundary. The mode is fixed per call site, so hook order stays stable.
  if (props.value && props.onChange) {
    return (
      <ControlledRoot
        {...props}
        value={props.value}
        onChange={props.onChange}
      />
    );
  }

  return <UrlRoot {...props} />;
}

// sort select
export function CollectionFiltersSortSelect(props?: SortOptions) {
  const ctx = useFilterContext();
  const active = resolveSortField(ctx.value, props);

  const item = (field: CollectionSortField, label: string) => (
    <Menu.Item
      onClick={() => ctx.setValue({ sort: field })}
      rightSection={active === field && <IoMdCheckmark />}
      closeMenuOnClick={false}
    >
      {label}
    </Menu.Item>
  );

  return (
    <Fragment>
      <Menu.Label>Sort</Menu.Label>
      {props?.showAddedAt && item(CollectionSortField.ADDED_AT, 'Date Added')}
      {item(CollectionSortField.CREATED_AT, 'Date Created')}
      {item(CollectionSortField.UPDATED_AT, 'Last Updated')}
      {item(CollectionSortField.CARD_COUNT, 'Card Count')}
      {item(CollectionSortField.NAME, 'Name')}
    </Fragment>
  );
}

// sort order select
export function CollectionFiltersSortOrderSelect(props?: SortOptions) {
  const ctx = useFilterContext();

  // With no explicit choice, mirror whatever the active field would default
  // to on the server (ascending for name, descending for the rest).
  const active =
    ctx.value.sortOrder ??
    getCollectionsSortParams(resolveSortField(ctx.value, props)).sortOrder;

  const item = (order: SortOrder, label: string) => (
    <Menu.Item
      onClick={() => ctx.setValue({ sortOrder: order })}
      rightSection={active === order && <IoMdCheckmark />}
      closeMenuOnClick={false}
    >
      {label}
    </Menu.Item>
  );

  return (
    <Fragment>
      <Menu.Label>Order</Menu.Label>
      <Menu.Sub>
        <Menu.Sub.Target>
          <Menu.Sub.Item>
            {active === SortOrder.ASC ? 'Ascending' : 'Descending'}
          </Menu.Sub.Item>
        </Menu.Sub.Target>
        <Menu.Sub.Dropdown>
          {item(SortOrder.DESC, 'Descending')}
          {item(SortOrder.ASC, 'Ascending')}
        </Menu.Sub.Dropdown>
      </Menu.Sub>
    </Fragment>
  );
}

// access type select
const ACCESS_TYPE_LABELS: Record<CollectionAccessType, string> = {
  [CollectionAccessType.OPEN]: 'Open',
  [CollectionAccessType.CLOSED]: 'Personal',
};

export function CollectionFiltersAccessTypeSelect() {
  const ctx = useFilterContext();
  const active = ctx.value.accessType;

  const item = (
    accessType: CollectionAccessType | undefined,
    label: string,
  ) => (
    <Menu.Item
      onClick={() => ctx.setValue({ accessType })}
      rightSection={active === accessType && <IoMdCheckmark />}
      closeMenuOnClick={false}
    >
      {label}
    </Menu.Item>
  );

  return (
    <Fragment>
      <Menu.Label>Access</Menu.Label>
      <Menu.Sub>
        <Menu.Sub.Target>
          <Menu.Sub.Item>
            {active ? ACCESS_TYPE_LABELS[active] : 'All'}
          </Menu.Sub.Item>
        </Menu.Sub.Target>
        <Menu.Sub.Dropdown>
          {item(undefined, 'All')}
          {item(CollectionAccessType.OPEN, ACCESS_TYPE_LABELS.OPEN)}
          {item(CollectionAccessType.CLOSED, ACCESS_TYPE_LABELS.CLOSED)}
        </Menu.Sub.Dropdown>
      </Menu.Sub>
    </Fragment>
  );
}

// author select
export function CollectionFiltersAuthorSelect() {
  const ctx = useFilterContext();
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 200);
  const firstResultRef = useRef<HTMLButtonElement>(null);

  const {
    data: actors = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['bluesky user search', debounced],
    queryFn: () => searchBlueskyUsers(debounced),
    enabled: debounced.trim().length > 0,
  });

  const selected = ctx.value.author;

  // Menu.Dropdown hijacks Arrow keys to focus its own first item, which would
  // otherwise pull focus out of this input and onto a Sort item.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      firstResultRef.current?.focus();
    }
  };

  if (selected) {
    return (
      <Fragment>
        <Menu.Label>Author</Menu.Label>
        <Menu.Item
          onClick={() => {
            setQuery('');
            ctx.setValue({ author: undefined });
          }}
          rightSection={<IoClose />}
          closeMenuOnClick={false}
        >
          @{selected}
        </Menu.Item>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Menu.Label>Author</Menu.Label>
      <Box px="xs" pb={4}>
        <TextInput
          variant="filled"
          size="xs"
          radius="xl"
          placeholder="Search handle"
          leftSection={<MdOutlineAlternateEmail size={14} />}
          rightSection={
            isFetching ? (
              <Loader size={12} />
            ) : (
              query && <CloseButton size="xs" onClick={() => setQuery('')} />
            )
          }
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={onKeyDown}
        />
      </Box>

      {debounced.trim().length > 0 && (
        <ScrollArea.Autosize type="scroll" mah={200}>
          {error && (
            <Text px="xs" py={4} size="sm" c="dimmed">
              Could not search profiles
            </Text>
          )}
          {!error && !isFetching && actors.length === 0 && (
            <Text px="xs" py={4} size="sm" c="dimmed">
              No profiles found
            </Text>
          )}
          {actors.map((actor, index) => (
            <Menu.Item
              key={actor.did}
              ref={index === 0 ? firstResultRef : undefined}
              onClick={() => ctx.setValue({ author: actor.handle })}
              closeMenuOnClick={false}
              leftSection={
                <Avatar
                  size={22}
                  src={actor.avatar?.replace('avatar', 'avatar_thumbnail')}
                  alt={actor.handle}
                />
              }
            >
              <Stack gap={0}>
                <Text fw={500} size="sm" lineClamp={1}>
                  {actor.displayName || actor.handle}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  @{actor.handle}
                </Text>
              </Stack>
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      )}
    </Fragment>
  );
}

// view toggle
export function CollectionFiltersViewToggle() {
  const { settings, updateSetting } = useSettings();

  return (
    <Fragment>
      <Menu.Label>Collection View</Menu.Label>
      <Menu.Item
        leftSection={<BsGrid />}
        rightSection={settings.collectionView === 'grid' && <IoMdCheckmark />}
        onClick={() => updateSetting('collectionView', 'grid')}
        closeMenuOnClick={false}
      >
        Grid
      </Menu.Item>
      <Menu.Item
        leftSection={<CiGrid2H />}
        rightSection={
          settings.collectionView === 'compact' && <IoMdCheckmark />
        }
        onClick={() => updateSetting('collectionView', 'compact')}
        closeMenuOnClick={false}
      >
        Compact
      </Menu.Item>
    </Fragment>
  );
}

export const CollectionFilters = {
  Root: CollectionFiltersRoot,
  SortSelect: CollectionFiltersSortSelect,
  SortOrderSelect: CollectionFiltersSortOrderSelect,
  AccessTypeSelect: CollectionFiltersAccessTypeSelect,
  AuthorSelect: CollectionFiltersAuthorSelect,
  ViewToggle: CollectionFiltersViewToggle,
};
