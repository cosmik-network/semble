import { Text } from '@mantine/core';
import { ReactNode } from 'react';
import styles from './KnowledgeTrail.module.css';

/**
 * One stop along the knowledge trail: a tangerine label centered above a
 * decorative preview card. On desktop the stop is placed in the left or right
 * column by its `index` (see KnowledgeTrail.module.css); on mobile every stop
 * stacks centered.
 */
export default function TrailStop(props: {
  index: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.stop} data-index={props.index}>
      <Text className={styles.label} c="dimmed" fw={700}>
        {props.label}
      </Text>
      <div className={styles.stopCard}>{props.children}</div>
    </div>
  );
}
