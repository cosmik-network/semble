import { Badge } from '@mantine/core';
import type { ConnectionType } from '@semble/types';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';

interface Props {
  type: ConnectionType;
  own: boolean;
  hasNote?: boolean;
}

export default function ConnectionTypePill(props: Props) {
  const config = CONNECTION_TYPES.find((type) => type.value === props.type);
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Badge
      size="lg"
      tt="none"
      fw={600}
      color="green"
      variant={props.own ? 'filled' : 'outline'}
      bg={props.own ? undefined : 'var(--mantine-color-body)'}
      leftSection={<Icon size={14} />}
      rightSection={props.hasNote && <MdOutlineStickyNote2 size={13} />}
      style={{
        whiteSpace: 'nowrap',
        borderStyle: props.own ? undefined : 'dashed',
      }}
    >
      {config.label}
    </Badge>
  );
}
