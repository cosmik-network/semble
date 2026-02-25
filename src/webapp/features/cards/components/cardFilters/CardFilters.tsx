'use client';

import { Group, Button, Popover, Menu } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useContext,
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
import { BsGrid, BsListTask } from 'react-icons/bs';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { IoMdCheckmark } from 'react-icons/io';

// context
interface FilterContextValue {
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const useFilterContext = () => {
  const ctx = useContext(FilterContext);
  if (!ctx)
    throw new Error(
      'CardFilter components must be wrapped in CardFilters.Root',
    );
  return ctx;
};

// root
export function Root(props: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <FilterContext.Provider
      value={{
        router,
        searchParams,
      }}
    >
      <Menu shadow="sm">
        <Menu.Target>
          <Button variant="light" color="gray" leftSection={<MdFilterList />}>
            Filters
          </Button>
        </Menu.Target>
        <Menu.Dropdown w={200}>{props.children}</Menu.Dropdown>
      </Menu>
    </FilterContext.Provider>
  );
}

// sort select
// sort select (menu-style)
export function SortSelect() {
  const ctx = useFilterContext();
  const [, startTransition] = useTransition();

  const sortFromUrl =
    (ctx.searchParams.get('sort') as CardSortField) ?? CardSortField.UPDATED_AT;

  const [optimisticSort, setOptimisticSort] =
    useOptimistic<CardSortField>(sortFromUrl);

  const onChange = (next: CardSortField) => {
    startTransition(() => {
      setOptimisticSort(next);

      const params = new URLSearchParams(ctx.searchParams.toString());
      params.set('sort', next);

      ctx.router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Fragment>
      <Menu.Label>Sort</Menu.Label>

      <Menu.Item
        onClick={() => onChange(CardSortField.UPDATED_AT)}
        rightSection={
          optimisticSort === CardSortField.UPDATED_AT && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Newest
      </Menu.Item>

      <Menu.Item
        onClick={() => onChange(CardSortField.CREATED_AT)}
        rightSection={
          optimisticSort === CardSortField.CREATED_AT && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Oldest
      </Menu.Item>

      <Menu.Item
        onClick={() => onChange(CardSortField.LIBRARY_COUNT)}
        rightSection={
          optimisticSort === CardSortField.LIBRARY_COUNT && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Most Popular
      </Menu.Item>
    </Fragment>
  );
}

// type filter
export function TypeFilter() {
  const ctx = useFilterContext();
  const [, startTransition] = useTransition();

  const typeFromUrl = ctx.searchParams.get('type') as UrlType | null;

  const [optimisticType, setOptimisticType] = useOptimistic<UrlType | null>(
    typeFromUrl,
  );

  const [opened, setOpened] = useState(false);

  const onChange = (type?: UrlType) => {
    const nextType = type ?? null;

    startTransition(() => {
      setOptimisticType(nextType);

      const params = new URLSearchParams(ctx.searchParams.toString());
      if (nextType) {
        params.set('type', nextType);
      } else {
        params.delete('type');
      }

      ctx.router.replace(`?${params.toString()}`, { scroll: false });
    });

    setOpened(false);
  };

  const SelectedIcon =
    optimisticType === null ? MdFilterList : getUrlTypeIcon(optimisticType);

  return (
    <Fragment>
      <Menu.Label>Type</Menu.Label>
      <Popover opened={opened} onChange={setOpened} shadow="sm">
        <Popover.Target>
          <Button
            variant="light"
            color="gray"
            radius={'md'}
            leftSection={<SelectedIcon />}
            onClick={() => setOpened((o) => !o)}
            fullWidth
          >
            {optimisticType ? upperFirst(optimisticType) : 'All Cards'}
          </Button>
        </Popover.Target>

        <Popover.Dropdown maw={300}>
          <Group gap={6}>
            <Button
              size="xs"
              color="lime"
              variant={optimisticType === null ? 'filled' : 'light'}
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
                  variant={optimisticType === type ? 'filled' : 'light'}
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

// view toggle
export function ViewToggle() {
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
        leftSection={<BsListTask />}
        rightSection={settings.cardView === 'list' && <IoMdCheckmark />}
        onClick={() => updateSetting('cardView', 'list')}
        closeMenuOnClick={false}
      >
        List{' '}
      </Menu.Item>
    </Fragment>
  );
}

export const CardFilters = {
  Root,
  SortSelect,
  TypeFilter,
  ViewToggle,
};
