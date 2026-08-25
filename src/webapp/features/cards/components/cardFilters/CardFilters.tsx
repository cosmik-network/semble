'use client';

import { Group, Button, Popover, Menu } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  use,
  createElement,
  useCallback,
  useState,
  ReactNode,
  useOptimistic,
  useTransition,
  Fragment,
} from 'react';
import { upperFirst } from '@mantine/hooks';
import { CardSortField, UrlType } from '@semble/types';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { MdFilterList } from 'react-icons/md';
import { BsGrid, BsListUl } from 'react-icons/bs';
import { CiGrid2H } from 'react-icons/ci';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { IoMdCheckmark } from 'react-icons/io';
import { FaAsterisk } from 'react-icons/fa';

/** Every filter these controls can express. All fields optional = "no filter". */
export interface CardFilterState {
  sort?: CardSortField;
  type?: UrlType;
  uncollected?: boolean;
}

/**
 * URL param names used by the uncontrolled mode. Deliberately unprefixed —
 * several containers read these bare names straight off useSearchParams.
 */
const PARAMS = {
  sort: 'sort',
  type: 'type',
  uncollected: 'uncollected',
} as const;

// context
interface FilterContextValue {
  value: CardFilterState;
  setValue: (patch: Partial<CardFilterState>) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const useFilterContext = () => {
  const ctx = use(FilterContext);
  if (!ctx)
    throw new Error('CardFilter components must be wrapped in CardFiltersRoot');
  return ctx;
};

/** The active sort field, shared so every member agrees on the default. */
function resolveSortField(value: CardFilterState): CardSortField {
  return value.sort ?? CardSortField.UPDATED_AT;
}

// root
interface RootProps {
  children: ReactNode;
  /** Dropdown width. */
  width?: number | string;
  /** Pass both to drive the filters from local state instead of the URL. */
  value?: CardFilterState;
  onChange?: (next: CardFilterState) => void;
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
    value: CardFilterState;
    onChange: (next: CardFilterState) => void;
  },
) {
  const { value, onChange } = props;

  const setValue = useCallback(
    (patch: Partial<CardFilterState>) => onChange({ ...value, ...patch }),
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

  const valueFromUrl: CardFilterState = {
    sort: (searchParams.get(PARAMS.sort) as CardSortField) ?? undefined,
    type: (searchParams.get(PARAMS.type) as UrlType) ?? undefined,
    uncollected: searchParams.get(PARAMS.uncollected) === 'true',
  };

  const [value, setOptimisticValue] =
    useOptimistic<CardFilterState>(valueFromUrl);

  const setValue = (patch: Partial<CardFilterState>) => {
    const next = { ...value, ...patch };

    startTransition(() => {
      setOptimisticValue(next);

      const params = new URLSearchParams(searchParams.toString());

      if (next.sort) params.set(PARAMS.sort, next.sort);
      else params.delete(PARAMS.sort);

      if (next.type) params.set(PARAMS.type, next.type);
      else params.delete(PARAMS.type);

      if (next.uncollected) params.set(PARAMS.uncollected, 'true');
      else params.delete(PARAMS.uncollected);

      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <FilterContext value={{ value, setValue }}>
      <FiltersShell width={props.width}>{props.children}</FiltersShell>
    </FilterContext>
  );
}

export function CardFiltersRoot(props: RootProps) {
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
export function CardFiltersSortSelect() {
  const ctx = useFilterContext();
  const active = resolveSortField(ctx.value);

  const item = (field: CardSortField, label: string) => (
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
      {item(CardSortField.UPDATED_AT, 'Newest')}
      {item(CardSortField.CREATED_AT, 'Oldest')}
      {item(CardSortField.LIBRARY_COUNT, 'Most Popular')}
    </Fragment>
  );
}

// type filter
export function CardFiltersTypeFilter() {
  const ctx = useFilterContext();
  const [opened, setOpened] = useState(false);

  const active = ctx.value.type ?? null;

  const onChange = (type?: UrlType) => {
    ctx.setValue({ type });
    setOpened(false);
  };

  // Built as an element, not a capitalised component variable: getUrlTypeIcon
  // only ever returns module-level icons, but rendering the result as <Icon />
  // reads to the linter as a component defined during render.
  const selectedIcon = createElement(
    active === null ? FaAsterisk : getUrlTypeIcon(active),
  );

  return (
    <Fragment>
      <Menu.Label>Type</Menu.Label>
      <Popover opened={opened} onChange={setOpened} shadow="sm">
        <Popover.Target>
          <Menu.Item
            variant="light"
            leftSection={selectedIcon}
            closeMenuOnClick={false}
            onClick={() => setOpened((o) => !o)}
          >
            {active ? upperFirst(active) : 'All Cards'}
          </Menu.Item>
        </Popover.Target>

        <Popover.Dropdown maw={300} p={'xs'}>
          <Group gap={6}>
            <Button
              size="xs"
              color="lime"
              variant={active === null ? 'filled' : 'light'}
              leftSection={<FaAsterisk />}
              onClick={() => onChange()}
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
                  variant={active === type ? 'filled' : 'light'}
                  leftSection={<Icon />}
                  onClick={() => onChange(type)}
                >
                  {upperFirst(type)}
                </Button>
              );
            })}
          </Group>
        </Popover.Dropdown>
      </Popover>
    </Fragment>
  );
}

// uncollected toggle
export function CardFiltersUncollectedToggle() {
  const ctx = useFilterContext();
  const active = ctx.value.uncollected ?? false;

  return (
    <Fragment>
      <Menu.Label>Status</Menu.Label>
      <Menu.Item
        rightSection={active && <IoMdCheckmark />}
        onClick={() => ctx.setValue({ uncollected: !active })}
        closeMenuOnClick={false}
      >
        Not in collection
      </Menu.Item>
    </Fragment>
  );
}

// view toggle
export function CardFiltersViewToggle() {
  const { settings, updateSetting } = useUserSettings();

  return (
    <Fragment>
      <Menu.Label>Card View</Menu.Label>
      <Menu.Item
        leftSection={<BsGrid />}
        rightSection={settings.cardView === 'grid' && <IoMdCheckmark />}
        onClick={() => updateSetting('cardView', 'grid')}
        closeMenuOnClick={false}
      >
        Grid
      </Menu.Item>
      <Menu.Item
        leftSection={<CiGrid2H />}
        rightSection={settings.cardView === 'compact' && <IoMdCheckmark />}
        onClick={() => updateSetting('cardView', 'compact')}
        closeMenuOnClick={false}
      >
        Compact
      </Menu.Item>
      <Menu.Item
        leftSection={<BsListUl />}
        rightSection={settings.cardView === 'list' && <IoMdCheckmark />}
        onClick={() => updateSetting('cardView', 'list')}
        closeMenuOnClick={false}
      >
        List
      </Menu.Item>
    </Fragment>
  );
}

export const CardFilters = {
  Root: CardFiltersRoot,
  SortSelect: CardFiltersSortSelect,
  TypeFilter: CardFiltersTypeFilter,
  UncollectedToggle: CardFiltersUncollectedToggle,
  ViewToggle: CardFiltersViewToggle,
};
