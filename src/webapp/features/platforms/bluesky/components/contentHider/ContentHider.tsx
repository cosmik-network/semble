'use client';

import { Fragment, ReactNode, useState } from 'react';
import { Alert, Collapse, Group, Text } from '@mantine/core';
import { IoMdInformationCircle } from 'react-icons/io';
import styles from './ContentHider.module.css';

interface Props {
  blur: boolean;
  noOverride: boolean;
  reason: string;
  children: ReactNode;
}

export default function ContentHider(props: Props) {
  const { blur, noOverride, reason, children } = props;
  const [show, setShow] = useState(false);

  if (!blur) {
    return children;
  }

  const canToggle = !noOverride;

  const handleToggle = (e: React.MouseEvent) => {
    if (!canToggle) return;
    e.stopPropagation();
    setShow((prev) => !prev);
  };

  return (
    <Fragment>
      <Alert
        component={'button'}
        variant="light"
        color="gray"
        p={'sm'}
        className={styles.alert}
        onClick={handleToggle}
        style={{ cursor: canToggle ? 'pointer' : undefined }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap={'xs'} c={'gray'}>
            <IoMdInformationCircle size={18} />
            <Text fw={600} fz="sm">
              {reason}
            </Text>
          </Group>
          {canToggle && (
            <Text fw={700} fz="sm" c="gray">
              {show ? 'Hide' : 'Show'}
            </Text>
          )}
        </Group>
      </Alert>
      <Collapse in={show}>{children}</Collapse>
    </Fragment>
  );
}
