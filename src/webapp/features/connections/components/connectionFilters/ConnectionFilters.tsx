'use client';

import { Group, Button, Menu } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useContext,
  ReactNode,
  useOptimistic,
  useTransition,
} from 'react';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList } from 'react-icons/md';

// Connection type enum values matching the backend
const CONNECTION_TYPES = [
  'SUPPORTS',
  'OPPOSES',
  'ADDRESSES',
  'HELPFUL',
  'LEADS_TO',
  'RELATED',
  'SUPPLEMENT',
  'EXPLAINER',
] as const;

type ConnectionType = (typeof CONNECTION_TYPES)[number];

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
      'ConnectionFilter components must be wrapped in ConnectionFilters.Root',
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
        <Menu.Dropdown maw={300}>{props.children}</Menu.Dropdown>
      </Menu>
    </FilterContext.Provider>
  );
}

// connection type filter
export function ConnectionTypeFilter() {
  const ctx = useFilterContext();
  const [, startTransition] = useTransition();

  const typeFromUrl = ctx.searchParams.get(
    'connectionType',
  ) as ConnectionType | null;

  const [optimisticType, setOptimisticType] =
    useOptimistic<ConnectionType | null>(typeFromUrl);

  const onChange = (type?: ConnectionType) => {
    const nextType = type ?? null;

    startTransition(() => {
      setOptimisticType(nextType);

      const params = new URLSearchParams(ctx.searchParams.toString());
      if (nextType) {
        params.set('connectionType', nextType);
      } else {
        params.delete('connectionType');
      }

      ctx.router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const formatConnectionType = (type: string) => {
    return type
      .toLowerCase()
      .split('_')
      .map((word) => upperFirst(word))
      .join(' ');
  };

  return (
    <Group gap={6}>
      <Button
        size="xs"
        color="blue"
        variant={optimisticType === null ? 'filled' : 'light'}
        onClick={() => onChange()}
      >
        All Types
      </Button>

      {CONNECTION_TYPES.map((type) => {
        return (
          <Button
            key={type}
            size="xs"
            color="blue"
            variant={optimisticType === type ? 'filled' : 'light'}
            onClick={() => onChange(type)}
          >
            {formatConnectionType(type)}
          </Button>
        );
      })}
    </Group>
  );
}

export const ConnectionFilters = {
  Root,
  ConnectionTypeFilter,
};
