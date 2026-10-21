import { useState } from 'react';
import { ActionIcon, Group, Paper, Text, TextInput } from '@mantine/core';
import { stopEventPropagation, TLShapeId, useEditor, useValue } from 'tldraw';
import { LuChevronDown, LuChevronUp, LuSearch, LuX } from 'react-icons/lu';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { isHiddenByCollapse } from '../../lib/frames';
import styles from './FindOnCanvas.module.css';

const FIND_ANIMATION = { animation: { duration: 300 } };

export default function FindOnCanvas() {
  const session = useCanvasSession();
  const open = useValue(session.findOpen);
  if (!open) return null;
  return <FindBox onClose={() => session.findOpen.set(false)} />;
}

function FindBox(props: { onClose: () => void }) {
  const editor = useEditor();
  const [query, setQuery] = useState('');
  // null until the user jumps to a match
  const [index, setIndex] = useState<number | null>(null);
  const q = query.trim().toLowerCase();

  // Matches in reading order, so next/previous move predictably
  const matches = useValue(
    'find matches',
    () => {
      if (!q) return [];
      return editor
        .getCurrentPageShapes()
        .filter(
          (s) =>
            isCardShape(s) &&
            !s.props.ghost &&
            !isHiddenByCollapse(editor, s) &&
            [s.props.title, s.props.siteName, s.props.url, s.props.note]
              .join(' ')
              .toLowerCase()
              .includes(q),
        )
        .map((s) => ({ id: s.id, bounds: editor.getShapePageBounds(s)! }))
        .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x)
        .map((m) => m.id);
    },
    [editor, q],
  );

  const goTo = (ids: TLShapeId[], i: number) => {
    if (!ids.length) return;
    const next = (i + ids.length) % ids.length;
    setIndex(next);
    const bounds = editor.getShapePageBounds(ids[next]);
    if (!bounds) return;
    editor.select(ids[next]);
    editor.zoomToBounds(bounds, {
      inset: 200,
      targetZoom: Math.max(editor.getZoomLevel(), 1),
      ...FIND_ANIMATION,
    });
  };

  const step = (delta: number) =>
    goTo(matches, index === null ? (delta > 0 ? 0 : -1) : index + delta);

  const close = () => {
    props.onClose();
    editor.focus();
  };

  return (
    <Paper
      className={styles.root}
      shadow="md"
      radius="xl"
      p={4}
      withBorder
      onPointerDown={stopEventPropagation}
    >
      <Group gap={4} wrap="nowrap">
        <TextInput
          flex={1}
          variant="unstyled"
          autoFocus
          placeholder="Find cards on the canvas"
          leftSection={<LuSearch />}
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setIndex(null);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') close();
            if (e.key === 'Enter') step(e.shiftKey ? -1 : 1);
          }}
        />
        {q && (
          <Text className={styles.count} size="sm" c="dimmed" px={4}>
            {matches.length
              ? `${(index ?? 0) + 1} of ${matches.length}`
              : 'No matches'}
          </Text>
        )}
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          aria-label="Previous match"
          disabled={!matches.length}
          onClick={() => step(-1)}
        >
          <LuChevronUp />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          aria-label="Next match"
          disabled={!matches.length}
          onClick={() => step(1)}
        >
          <LuChevronDown />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          aria-label="Close find"
          onClick={close}
        >
          <LuX />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
