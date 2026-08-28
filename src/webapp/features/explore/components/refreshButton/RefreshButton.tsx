'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { useState } from 'react';
import { BiRefresh } from 'react-icons/bi';
import styles from './RefreshButton.module.css';

interface Props {
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** Tooltip and accessible name. */
  label: string;
  color?: string;
  size?: number | string;
}

export default function RefreshButton(props: Props) {
  const [spins, setSpins] = useState(0);

  return (
    <Tooltip label={props.label}>
      <ActionIcon
        variant="light"
        color={props.color ?? 'blue'}
        radius="xl"
        size={props.size ?? 36}
        onClick={() => {
          setSpins((count) => count + 1);
          props.onRefresh();
        }}
        aria-label={props.label}
      >
        <BiRefresh
          // Remounting replays the animation, so a refresh answered from cache
          // still moves.
          key={spins}
          size={20}
          className={
            props.isRefreshing
              ? styles.busy
              : spins > 0
                ? styles.spinning
                : undefined
          }
        />
      </ActionIcon>
    </Tooltip>
  );
}
