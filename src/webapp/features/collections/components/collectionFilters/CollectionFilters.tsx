'use client';

import { Button, Menu } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useContext,
  ReactNode,
  Fragment,
  useOptimistic,
  useTransition,
} from 'react';
import { CollectionSortField } from '@semble/types';
import { MdFilterList } from 'react-icons/md';
import { BsGrid } from 'react-icons/bs';
import { CiGrid2H } from 'react-icons/ci';
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
      'CollectionFilter components must be wrapped in CollectionFiltersRoot',
    );
  return ctx;
};

// root
export function CollectionFiltersRoot(props: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <FilterContext.Provider value={{ router, searchParams }}>
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
export function CollectionFiltersSortSelect() {
  const ctx = useFilterContext();
  const [, startTransition] = useTransition();

  const sortFromUrl =
    (ctx.searchParams.get('collectionSort') as CollectionSortField) ??
    CollectionSortField.UPDATED_AT;

  const [optimisticSort, setOptimisticSort] =
    useOptimistic<CollectionSortField>(sortFromUrl);

  const onChange = (next: CollectionSortField) => {
    startTransition(() => {
      setOptimisticSort(next);

      const params = new URLSearchParams(ctx.searchParams.toString());
      params.set('collectionSort', next);

      ctx.router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Fragment>
      <Menu.Label>Sort</Menu.Label>
      <Menu.Item
        onClick={() => onChange(CollectionSortField.UPDATED_AT)}
        rightSection={
          optimisticSort === CollectionSortField.UPDATED_AT && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Last Updated
      </Menu.Item>
      <Menu.Item
        onClick={() => onChange(CollectionSortField.CREATED_AT)}
        rightSection={
          optimisticSort === CollectionSortField.CREATED_AT && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Date Created
      </Menu.Item>
      <Menu.Item
        onClick={() => onChange(CollectionSortField.CARD_COUNT)}
        rightSection={
          optimisticSort === CollectionSortField.CARD_COUNT && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Card Count
      </Menu.Item>
      <Menu.Item
        onClick={() => onChange(CollectionSortField.NAME)}
        rightSection={
          optimisticSort === CollectionSortField.NAME && <IoMdCheckmark />
        }
        closeMenuOnClick={false}
      >
        Name
      </Menu.Item>
    </Fragment>
  );
}

// view toggle
export function CollectionFiltersViewToggle() {
  const { settings, updateSetting } = useUserSettings();

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
  ViewToggle: CollectionFiltersViewToggle,
};
