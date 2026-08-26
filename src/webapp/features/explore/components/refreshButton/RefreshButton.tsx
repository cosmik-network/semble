'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { useState } from 'react';
import { BiRefresh } from 'react-icons/bi';
import styles from './RefreshButton.module.css';

interface Props {
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** What's being refreshed, lowercase and plural ("cards"). */
  subject: string;
}

export default function RefreshButton(props: Props) {
  const [spinKey, setSpinKey] = useState(0);

  const onClick = () => {
    setSpinKey((key) => key + 1);
    props.onRefresh();
  };

  return (
    <Tooltip label={`Show different ${props.subject}`}>
      <ActionIcon
        variant="light"
        color="blue"
        radius="xl"
        size={36}
        onClick={onClick}
        aria-label={`Show different ${props.subject}`}
      >
        <BiRefresh
          key={spinKey}
          size={20}
          className={
            props.isRefreshing
              ? styles.busy
              : spinKey > 0
                ? styles.spinning
                : undefined
          }
        />
      </ActionIcon>
    </Tooltip>
  );
}
