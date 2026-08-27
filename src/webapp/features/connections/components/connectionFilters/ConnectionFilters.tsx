'use client';

import { Group, Button, Menu } from '@mantine/core';
import {
  createContext,
  use,
  ReactNode,
  useOptimistic,
  useTransition,
} from 'react';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList } from 'react-icons/md';
import { ConnectionType } from '@semble/types';
import { CONNECTION_TYPES } from '../../const/connectionTypes';

// context
interface FilterContextValue {
  connectionType: ConnectionType | null;
  onConnectionTypeChange: (type: ConnectionType | null) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

const useFilterContext = () => {
  const ctx = use(FilterContext);
  if (!ctx)
    throw new Error(
      'ConnectionFilter components must be wrapped in ConnectionFilters.Root',
    );
  return ctx;
};

// root
interface RootProps {
  children: ReactNode;
  connectionType: ConnectionType | null;
  onConnectionTypeChange: (type: ConnectionType | null) => void;
}

export function Root(props: RootProps) {
  return (
    <FilterContext
      value={{
        connectionType: props.connectionType,
        onConnectionTypeChange: props.onConnectionTypeChange,
      }}
    >
      <Menu shadow="sm">
        <Menu.Target>
          <Button variant="light" color="gray" leftSection={<MdFilterList />}>
            Filters
          </Button>
        </Menu.Target>
        <Menu.Dropdown maw={300} p={'xs'}>
          {props.children}
        </Menu.Dropdown>
      </Menu>
    </FilterContext>
  );
}

// connection type filter
export function ConnectionTypeFilter() {
  const ctx = useFilterContext();
  const [, startTransition] = useTransition();

  const [optimisticConnectionType, setOptimisticConnectionType] =
    useOptimistic<ConnectionType | null>(ctx.connectionType);

  const onChange = (type?: ConnectionType) => {
    const nextType = type ?? null;

    startTransition(() => {
      setOptimisticConnectionType(nextType);
      ctx.onConnectionTypeChange(nextType);
    });
  };

  return (
    <Group gap={6}>
      <Button
        size="xs"
        color="green"
        variant={optimisticConnectionType === null ? 'filled' : 'light'}
        onClick={() => onChange()}
      >
        All Types
      </Button>

      {CONNECTION_TYPES.map((typeConfig) => {
        const Icon = typeConfig.icon;
        return (
          <Button
            key={typeConfig.value}
            size="xs"
            color="green"
            variant={
              optimisticConnectionType === typeConfig.value ? 'filled' : 'light'
            }
            onClick={() => onChange(typeConfig.value as ConnectionType)}
            leftSection={<Icon size={16} />}
          >
            {typeConfig.label}
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
