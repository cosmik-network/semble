import { useState } from 'react';
import { ActionIcon, Group, Paper, Tooltip } from '@mantine/core';
import { stopEventPropagation, useEditor, useValue } from 'tldraw';
import {
  LuChevronsLeft,
  LuChevronsRight,
  LuPanelRight,
  LuRoute,
  LuSparkles,
} from 'react-icons/lu';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { useCardActions } from '../../lib/useCardActions';
import styles from '../arrowActionBar/ArrowActionBar.module.css';

type Busy = 'backward' | 'forward' | null;

export default function CardActionBar() {
  const editor = useEditor();
  const actions = useCardActions(editor);
  const session = useCanvasSession();
  const similarOpenId = useValue(session.similarAnchorId);
  const [busy, setBusy] = useState<Busy>(null);

  const selected = useValue(
    'selected card',
    () => {
      if (!editor.isIn('select.idle')) return null;
      const shape = editor.getOnlySelectedShape();
      if (!isCardShape(shape) || shape.props.ghost) return null;
      const bounds = editor.getShapePageBounds(shape);
      if (!bounds) return null;
      return {
        id: shape.id,
        anchor: editor.pageToViewport({ x: bounds.midX, y: bounds.minY }),
      };
    },
    [editor],
  );

  if (!selected) return null;

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const buttons = [
    {
      label: 'Details',
      icon: <LuPanelRight />,
      onClick: () => actions.openDetails(selected.id),
    },
    {
      label: 'Suggest similar',
      icon: <LuSparkles />,
      active: similarOpenId === selected.id,
      onClick: () => actions.toggleSimilar(selected.id),
    },
    {
      label: 'Start trail from here',
      icon: <LuRoute />,
      onClick: () => actions.startTrail(selected.id),
    },
    {
      label: 'Show incoming connections',
      icon: <LuChevronsLeft />,
      loading: busy === 'backward',
      onClick: () =>
        run('backward', () => actions.expand(selected.id, 'backward')),
    },
    {
      label: 'Show outgoing connections',
      icon: <LuChevronsRight />,
      loading: busy === 'forward',
      onClick: () =>
        run('forward', () => actions.expand(selected.id, 'forward')),
    },
  ];

  return (
    <Paper
      className={styles.root}
      style={{ left: selected.anchor.x, top: selected.anchor.y }}
      shadow="md"
      radius="xl"
      p={4}
      withBorder
      onPointerDown={stopEventPropagation}
    >
      <Group gap={2} wrap="nowrap">
        {buttons.map((b) => (
          <Tooltip key={b.label} label={b.label} withinPortal={false}>
            <ActionIcon
              size="lg"
              radius="xl"
              variant={b.active ? 'light' : 'subtle'}
              color="gray"
              aria-label={b.label}
              loading={b.loading}
              disabled={busy !== null && !b.loading}
              onClick={b.onClick}
            >
              {b.icon}
            </ActionIcon>
          </Tooltip>
        ))}
      </Group>
    </Paper>
  );
}
