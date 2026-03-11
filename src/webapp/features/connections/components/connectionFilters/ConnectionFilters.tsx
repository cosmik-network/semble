'use client';

import { Group, Button, Menu } from '@mantine/core';
import { createContext, useContext, ReactNode } from 'react';
import { upperFirst } from '@mantine/hooks';
import { MdFilterList, MdOutlinePsychologyAlt } from 'react-icons/md';
import { ConnectionType } from '@semble/types';
import {
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
  BiCheckCircle,
  BiXCircle,
} from 'react-icons/bi';
import { PiNewspaperClipping } from 'react-icons/pi';

// Connection type enum values matching the backend
const CONNECTION_TYPES = [
  {
    value: 'SUPPORTS' as ConnectionType,
    label: 'Supports',
    icon: BiCheckCircle,
  },
  {
    value: 'OPPOSES' as ConnectionType,
    label: 'Opposes',
    icon: BiXCircle,
  },
  {
    value: 'ADDRESSES' as ConnectionType,
    label: 'Addresses',
    icon: BiMessageSquareDetail,
  },
  {
    value: 'HELPFUL' as ConnectionType,
    label: 'Helpful',
    icon: BiHelpCircle,
  },
  {
    value: 'LEADS_TO' as ConnectionType,
    label: 'Leads to',
    icon: BiRightArrowAlt,
  },
  {
    value: 'RELATED' as ConnectionType,
    label: 'Related',
    icon: BiLink,
  },
  {
    value: 'SUPPLEMENT' as ConnectionType,
    label: 'Supplement',
    icon: PiNewspaperClipping,
  },
  {
    value: 'EXPLAINER' as ConnectionType,
    label: 'Explainer',
    icon: MdOutlinePsychologyAlt,
  },
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
        const Icon = type.icon;
        return (
          <Button
            key={type.value}
            size="xs"
            color="green"
            variant={ctx.connectionType === type.value ? 'filled' : 'light'}
            onClick={() => onChange(type.value)}
            leftSection={<Icon size={16} />}
          >
            {type.label}
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
