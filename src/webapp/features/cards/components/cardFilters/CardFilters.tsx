'use client';

import { Group, Button, Popover, Select } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useOptimistic,
  useTransition,
} from 'react';
import { upperFirst } from '@mantine/hooks';
import { CardSortField, UrlType } from '@semble/types';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { MdFilterList } from 'react-icons/md';
import { BsFillGridFill, BsListTask } from 'react-icons/bs';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

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
      <Group gap="xs">{props.children}</Group>
    </FilterContext.Provider>
  );
}

// sort select
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
    <Select
      w={140}
      allowDeselect={false}
      variant="filled"
      size="sm"
      value={optimisticSort}
      onChange={(v) => onChange(v as CardSortField)}
      data={[
        { value: CardSortField.UPDATED_AT, label: 'Newest' },
        { value: CardSortField.CREATED_AT, label: 'Oldest' },
        { value: CardSortField.LIBRARY_COUNT, label: 'Most Popular' },
      ]}
    />
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
    <Popover opened={opened} onChange={setOpened} shadow="sm">
      <Popover.Target>
        <Button
          variant="light"
          color="gray"
          size="xs"
          leftSection={<SelectedIcon />}
          onClick={() => setOpened((o) => !o)}
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
  );
}

// view toggle
export function ViewToggle() {
  const { settings, updateSetting } = useUserSettings();

  const isGrid = settings.cardView === 'grid';

  return (
    <Button
      variant="light"
      color="gray"
      leftSection={isGrid ? <BsFillGridFill /> : <BsListTask />}
      onClick={() => updateSetting('cardView', isGrid ? 'list' : 'grid')}
    >
      {upperFirst(settings.cardView)}
    </Button>
  );
}

export const CardFilters = {
  Root,
  SortSelect,
  TypeFilter,
  ViewToggle,
};
