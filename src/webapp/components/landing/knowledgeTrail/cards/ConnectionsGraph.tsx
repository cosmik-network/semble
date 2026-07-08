import { Badge, Box } from '@mantine/core';
import { CSSProperties } from 'react';
import { BsArrowUp, BsArrowUpRight, BsArrowUpLeft } from 'react-icons/bs';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import { ConnectionType } from '@semble/types';

const typeByValue = new Map(CONNECTION_TYPES.map((t) => [t.value, t]));

// A green connection-type pill, positioned by percentage inside the stage.
function Pill(props: { type: ConnectionType; x: number; y: number }) {
  const config = typeByValue.get(props.type);
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge
      size="lg"
      radius="xl"
      color="green"
      variant="filled"
      tt="none"
      fw={600}
      leftSection={<Icon size={14} />}
      style={{
        position: 'absolute',
        left: `${props.x}%`,
        top: `${props.y}%`,
        transform: 'translate(-50%, -50%)',
        // Explicit content width: an absolutely-positioned element defaults to
        // shrink-to-fit against the container's right edge, which truncates the
        // pills nearest that edge. max-content keeps each pill full-width and
        // centered on (x, y).
        width: 'max-content',
        maxWidth: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 6px 16px -8px rgba(47, 158, 68, 0.6)',
      }}
    >
      {config.label}
    </Badge>
  );
}

// A decorative grey arrow between pills.
function Arrow(props: {
  x: number;
  y: number;
  rotate: number;
  icon: React.ReactNode;
}) {
  const style: CSSProperties = {
    position: 'absolute',
    left: `${props.x}%`,
    top: `${props.y}%`,
    transform: `translate(-50%, -50%) rotate(${props.rotate}deg)`,
    color: 'light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-2))',
    display: 'flex',
  };
  return (
    <Box style={style} aria-hidden>
      {props.icon}
    </Box>
  );
}

/**
 * Decorative connection graph for the "Follow the thoughtful connections others
 * have made" trail stop. Pills reuse the real CONNECTION_TYPES config so the
 * icons + labels stay truthful to the product.
 */
export default function ConnectionsGraph() {
  return (
    <Box pos="relative" w="100%" h={190} maw={320} mx="auto">
      <Pill type="SUPPLEMENT" x={72} y={12} />
      <Pill type="SUPPORTS" x={16} y={44} />
      <Pill type="OPPOSES" x={54} y={58} />
      <Pill type="RELATED" x={86} y={70} />
      <Pill type="EXPLAINER" x={26} y={90} />

      <Arrow x={68} y={35} rotate={0} icon={<BsArrowUp size={22} />} />
      <Arrow x={35} y={50} rotate={0} icon={<BsArrowUpRight size={22} />} />
      <Arrow x={73} y={64} rotate={0} icon={<BsArrowUpLeft size={22} />} />
      <Arrow x={40} y={76} rotate={0} icon={<BsArrowUpRight size={22} />} />
    </Box>
  );
}
