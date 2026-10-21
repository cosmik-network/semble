import { useEffect } from 'react';
import {
  ActionIcon,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { stopEventPropagation, useEditor, useValue } from 'tldraw';
import { LuArrowLeft, LuArrowRight, LuX } from 'react-icons/lu';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { focusTrailStep } from '../../lib/trail';
import styles from './TrailPlayer.module.css';

export default function TrailPlayer() {
  const editor = useEditor();
  const session = useCanvasSession();
  const trail = useValue(session.trail);
  const current = useValue(
    'trail card',
    () => {
      const t = session.trail.get();
      const shape = t ? editor.getShape(t.ids[t.index]) : undefined;
      return isCardShape(shape) ? shape : null;
    },
    [editor, session],
  );

  const currentId = current?.id;
  useEffect(() => {
    if (currentId) focusTrailStep(editor, currentId);
  }, [editor, currentId]);

  useEffect(() => {
    if (!trail) return;
    const go = (delta: number) =>
      session.trail.update((t) =>
        t
          ? {
              ...t,
              index: Math.min(t.ids.length - 1, Math.max(0, t.index + delta)),
            }
          : t,
      );
    // Captured before tldraw so arrow keys step the trail instead of nudging shapes
    const onKey = (e: KeyboardEvent) => {
      const keys: Record<string, () => void> = {
        ArrowRight: () => go(1),
        ArrowDown: () => go(1),
        ' ': () => go(1),
        ArrowLeft: () => go(-1),
        ArrowUp: () => go(-1),
        Escape: () => session.trail.set(null),
      };
      const action = keys[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [trail, session]);

  // A card removed mid-trail ends it
  useEffect(() => {
    if (trail && !current) session.trail.set(null);
  }, [trail, current, session]);

  if (!trail || !current) return null;
  const step = trail.index + 1;
  const total = trail.ids.length;
  const go = (index: number) => session.trail.set({ ...trail, index });

  return (
    <Paper
      className={styles.root}
      shadow="md"
      radius="lg"
      p="xs"
      withBorder
      onPointerDown={stopEventPropagation}
    >
      <Stack gap={8}>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Previous" withinPortal={false}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              aria-label="Previous"
              disabled={trail.index === 0}
              onClick={() => go(trail.index - 1)}
            >
              <LuArrowLeft />
            </ActionIcon>
          </Tooltip>
          <Stack gap={0} flex={1} miw={0}>
            <Text className={styles.progress} size="xs" c="dimmed" fw={600}>
              Trail · {step} of {total}
            </Text>
            <Text fw={600} lineClamp={1}>
              {current.props.title || current.props.url}
            </Text>
          </Stack>
          <Tooltip label="Next" withinPortal={false}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              aria-label="Next"
              disabled={step === total}
              onClick={() => go(trail.index + 1)}
            >
              <LuArrowRight />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="End trail" withinPortal={false}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              aria-label="End trail"
              onClick={() => session.trail.set(null)}
            >
              <LuX />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Progress value={(step / total) * 100} size="xs" radius="xl" />
      </Stack>
    </Paper>
  );
}
