import { useEffect, useState } from 'react';
import { AspectRatio, Image, Paper, Stack, Text } from '@mantine/core';
import { TLShapeId, useEditor, useValue } from 'tldraw';
import { getDomain } from '@/lib/utils/link';
import { HOVER_PREVIEW_DELAY } from '../../const';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { getStackSlots } from '../../lib/stacks';
import CanvasNote from '../canvasNote/CanvasNote';
import styles from './CardHoverPreview.module.css';

const PREVIEW_W = 340;
const GAP = 12;

export default function CardHoverPreview() {
  const editor = useEditor();
  const session = useCanvasSession();
  const hoveredId = useValue(
    'hover preview target',
    () => {
      if (!editor.isIn('select.idle') || session.trail.get()) return null;
      const id = editor.getHoveredShapeId();
      const shape = id ? editor.getShape(id) : undefined;
      if (!isCardShape(shape) || shape.props.ghost) return null;
      if (editor.getSelectedShapeIds().includes(shape.id)) return null;
      // Piles cascade on hover instead
      if (getStackSlots(editor).has(shape.id)) return null;
      return shape.id;
    },
    [editor, session],
  );
  const [shownId, setShownId] = useState<TLShapeId | null>(null);

  useEffect(() => {
    if (!hoveredId) return;
    const timer = setTimeout(() => setShownId(hoveredId), HOVER_PREVIEW_DELAY);
    return () => clearTimeout(timer);
  }, [hoveredId]);

  const id = hoveredId && shownId === hoveredId ? hoveredId : null;
  const preview = useValue(
    'hover preview',
    () => {
      const shape = id ? editor.getShape(id) : undefined;
      const bounds = shape && editor.getShapePageBounds(shape);
      if (!isCardShape(shape) || !bounds) return null;
      const viewport = editor.getViewportScreenBounds();
      const right = editor.pageToViewport({ x: bounds.maxX, y: bounds.minY });
      const left = editor.pageToViewport({ x: bounds.minX, y: bounds.minY });
      const fitsRight = right.x + GAP + PREVIEW_W < viewport.w;
      return {
        shape,
        x: fitsRight ? right.x + GAP : left.x - GAP - PREVIEW_W,
        y: Math.max(GAP, right.y),
      };
    },
    [editor, id],
  );

  if (!preview) return null;
  const p = preview.shape.props;

  return (
    <Paper
      className={styles.root}
      style={{ left: preview.x, top: preview.y }}
      shadow="md"
      radius="lg"
      withBorder
    >
      {p.imageUrl && (
        <AspectRatio ratio={1.91}>
          <Image src={p.imageUrl} alt="" fit="cover" h="100%" w="100%" />
        </AspectRatio>
      )}
      <Stack gap={6} p="sm">
        <Text c="gray" fz="sm" lineClamp={1}>
          {p.siteName || getDomain(p.url)}
        </Text>
        <Text c="bright" fw={600} fz="lg" lh={1.25} lineClamp={3}>
          {p.title || p.url}
        </Text>
        {p.description && (
          <Text c="gray" fz="sm" lineClamp={8}>
            {p.description}
          </Text>
        )}
        {p.note && <CanvasNote text={p.note} />}
      </Stack>
    </Paper>
  );
}
