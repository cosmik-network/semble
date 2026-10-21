import { Suspense, useLayoutEffect, useRef, useState } from 'react';
import {
  AspectRatio,
  Box,
  Badge,
  Card,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';
import { useEditor, useValue } from 'tldraw';
import { LuCopy, LuEyeOff } from 'react-icons/lu';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import UrlCardContentSkeleton from '@/features/cards/components/urlCardContent/Skeleton.UrlCardContent';
import { getDomain } from '@/lib/utils/link';
import { CARD_TYPE, STACK_FAN_STEP, STACK_OFFSET } from '../../const';
import { useCanvasSession } from '../../lib/canvasSession';
import { getStackSlots } from '../../lib/stacks';
import { isCardShape, serverWrite } from '../../lib/arrows';
import { fitContainerToCard } from '../../lib/frames';
import { getCardCopies } from '../../lib/nodes';
import CardShapeActions from '../cardShapeActions/CardShapeActions';
import type { CardShape } from '../../shapes/cardShape/CardShapeUtil';
import CanvasNote from '../canvasNote/CanvasNote';
import styles from './CardShapeBody.module.css';

interface Props {
  shape: CardShape;
}

export default function CardShapeBody(props: Props) {
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const shapeId = props.shape.id;
  const p = props.shape.props;
  const session = useCanvasSession();
  const slot = useValue(
    'stack slot',
    () => getStackSlots(editor).get(shapeId) ?? null,
    [editor, shapeId],
  );
  const fanned = useValue(
    'stack fanned',
    () => !!slot && session.fannedStackId.get() === slot.stackId,
    [session, slot],
  );
  // While presenting a trail, everything but the current card fades back
  const dimmed = useValue(
    'trail dimmed',
    () => {
      const trail = session.trail.get();
      return !!trail && trail.ids[trail.index] !== shapeId;
    },
    [session, shapeId],
  );

  const copies = useValue(
    'card copies',
    () => (p.ghost ? 0 : getCardCopies(editor, p.url).length),
    [editor, p.url, p.ghost],
  );
  // Hovering one copy points out the others
  const siblingHovered = useValue(
    'copy hovered',
    () => {
      const hoveredId = editor.getHoveredShapeId();
      if (!hoveredId || hoveredId === shapeId || p.ghost) return false;
      const hovered = editor.getShape(hoveredId);
      return (
        isCardShape(hovered) &&
        !hovered.props.ghost &&
        hovered.props.url === p.url
      );
    },
    [editor, shapeId, p.url, p.ghost],
  );

  const [noteOpen, setNoteOpen] = useState(false);
  const showActions =
    !p.ghost && p.status !== 'loading' && p.size !== 'compact';

  // The shape takes the height the card renders at, like in the feed
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const h = Math.ceil(el.offsetHeight);
      const shape = editor.getShape<CardShape>(shapeId);
      if (!shape || !h || Math.abs(shape.props.h - h) < 1) return;
      serverWrite(editor, () =>
        editor.updateShape({ id: shapeId, type: CARD_TYPE, props: { h } }),
      );
      const resized = editor.getShape<CardShape>(shapeId);
      if (resized) fitContainerToCard(editor, resized);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor, shapeId]);

  const cardContent = {
    url: p.url,
    title: p.title || undefined,
    description: p.description || undefined,
    imageUrl: p.imageUrl || undefined,
    siteName: p.siteName || undefined,
  };

  const content =
    p.status === 'loading' && !p.title ? (
      <UrlCardContentSkeleton />
    ) : p.size === 'compact' ? (
      <Stack gap={0}>
        <Text c="gray" fz="xs" lineClamp={1}>
          {getDomain(p.url)}
        </Text>
        <Text c="bright" fw={500} fz="sm" lineClamp={1}>
          {p.title || p.url}
        </Text>
      </Stack>
    ) : p.size === 'large' ? (
      <LargeContent {...cardContent} />
    ) : (
      <Suspense fallback={<UrlCardContentSkeleton />}>
        <UrlCardContent url={p.url} cardContent={cardContent} />
      </Suspense>
    );

  return (
    <div
      ref={ref}
      className={styles.root}
      style={{
        opacity: dimmed ? 0.25 : undefined,
        transform:
          fanned && slot
            ? `translate(${-slot.index * STACK_OFFSET}px, ${slot.index * (STACK_FAN_STEP - STACK_OFFSET)}px)`
            : undefined,
      }}
    >
      {slot && slot.index === slot.count - 1 && (
        <Badge className={styles.stackCount} size="lg" circle variant="filled">
          {slot.count}
        </Badge>
      )}
      {(copies > 1 || p.hideConnections) && (
        <Group className={styles.markers} gap={4}>
          {copies > 1 && (
            <Badge
              size="md"
              variant="default"
              leftSection={<LuCopy />}
              title={`On the canvas ${copies} times`}
            >
              {copies}
            </Badge>
          )}
          {p.hideConnections && (
            <Badge
              size="md"
              variant="default"
              circle
              title="Connections hidden on this card"
            >
              <LuEyeOff />
            </Badge>
          )}
        </Group>
      )}
      <Card
        component="article"
        radius="lg"
        p="sm"
        withBorder
        className={p.ghost ? styles.ghost : undefined}
        data-sibling-hovered={siblingHovered || undefined}
      >
        {content}
        {showActions && noteOpen && p.note && (
          <Box mt="xs" className={styles.interactive}>
            <CanvasNote text={p.note} />
          </Box>
        )}
        {showActions && (
          <CardShapeActions
            shapeId={shapeId}
            url={p.url}
            saved={!!p.cardId}
            hasNote={!!p.note}
            noteOpen={noteOpen}
            onToggleNote={() => setNoteOpen((open) => !open)}
          />
        )}
        {p.status === 'error' && (
          <Text size="xs" c="red" mt="xs">
            Could not save this link
          </Text>
        )}
      </Card>
    </div>
  );
}

function LargeContent(props: {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}) {
  const [imageError, setImageError] = useState(false);
  return (
    <Stack gap={4}>
      {props.imageUrl && !imageError && (
        <AspectRatio ratio={1.91} className={styles.cover}>
          <Image
            src={props.imageUrl}
            alt=""
            draggable={false}
            onError={() => setImageError(true)}
          />
        </AspectRatio>
      )}
      <Text c="gray" fz="sm" lineClamp={1}>
        {props.siteName || getDomain(props.url)}
      </Text>
      {props.title && (
        <Text c="bright" fw={600} fz="lg" lh={1.25} lineClamp={3}>
          {props.title}
        </Text>
      )}
      {props.description && (
        <Text c="gray" fz="sm" lineClamp={4}>
          {props.description}
        </Text>
      )}
    </Stack>
  );
}
