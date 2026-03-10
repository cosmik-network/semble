'use client';

import { Group, Button, Menu } from '@mantine/core';
import { createContext, useContext, ReactNode } from 'react';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList } from 'react-icons/md';
import { ConnectionType } from '@semble/types';

// Connection type enum values matching the backend
const CONNECTION_TYPES: ConnectionType[] = [
  'SUPPORTS',
  'OPPOSES',
  'ADDRESSES',
  'HELPFUL',
  'LEADS_TO',
  'RELATED',
  'SUPPLEMENT',
  'EXPLAINER',
];

// context
interface FilterContextValue {
  connectionType: ConnectionType | null;
  onConnectionTypeChange: (type: ConnectionType | null) => void;
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
interface RootProps {
  children: ReactNode;
  connectionType: ConnectionType | null;
  onConnectionTypeChange: (type: ConnectionType | null) => void;
}

export function Root(props: RootProps) {
  return (
    <FilterContext.Provider
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
        <Menu.Dropdown maw={300}>{props.children}</Menu.Dropdown>
      </Menu>
    </FilterContext.Provider>
  );
}

// connection type filter
export function ConnectionTypeFilter() {
  const ctx = useFilterContext();

  const onChange = (type?: ConnectionType) => {
    ctx.onConnectionTypeChange(type ?? null);
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
        color="green"
        variant={ctx.connectionType === null ? 'filled' : 'light'}
        onClick={() => onChange()}
      >
        All Types
      </Button>

      {CONNECTION_TYPES.map((type) => {
        return (
          <Button
            key={type}
            size="xs"
            color="green"
            variant={ctx.connectionType === type ? 'filled' : 'light'}
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
