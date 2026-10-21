import { Suspense, UIEvent, WheelEvent } from 'react';
import {
  ActionIcon,
  AspectRatio,
  Center,
  Group,
  Image,
  Loader,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import type { UrlMetadata } from '@semble/types';
import { Editor, stopEventPropagation, useEditor, useValue } from 'tldraw';
import { LuGlobe, LuSparkles, LuX } from 'react-icons/lu';
import useSimilarCards from '@/features/semble/lib/queries/useSimilarCards';
import { getDomain } from '@/lib/utils/link';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import type { CardShape } from '../../shapes/cardShape/CardShapeUtil';
import { PanelUrlCardItem } from '../panelCardItem/PanelCardItem';
import styles from './SimilarStrip.module.css';

const STRIP_W = 640;
const STRIP_H = 232;
const GAP = 12;

// Similar links pinned under a card; nothing lands on the canvas until added
export default function SimilarStrip() {
  const editor = useEditor();
  const session = useCanvasSession();
  const strip = useValue(
    'similar strip',
    () => {
      const id = session.similarAnchorId.get();
      const shape = id ? editor.getShape(id) : undefined;
      const bounds = shape && editor.getShapePageBounds(shape);
      if (!isCardShape(shape) || !bounds || !editor.isIn('select.idle')) {
        return null;
      }
      const viewport = editor.getViewportScreenBounds();
      const below = editor.pageToViewport({ x: bounds.midX, y: bounds.maxY });
      const w = Math.min(STRIP_W, viewport.w - GAP * 2);
      return {
        card: shape,
        w,
        x: Math.max(GAP, Math.min(below.x - w / 2, viewport.w - w - GAP)),
        y: Math.min(below.y + GAP, viewport.h - STRIP_H - GAP),
      };
    },
    [editor, session],
  );

  if (!strip) return null;

  return (
    <Paper
      className={styles.root}
      style={{ left: strip.x, top: strip.y, width: strip.w, height: STRIP_H }}
      shadow="md"
      radius="lg"
      withBorder
      onPointerDown={stopEventPropagation}
      onWheel={stopEventPropagation}
    >
      <Group justify="space-between" wrap="nowrap" px="sm" pt="xs">
        <Group gap={6} wrap="nowrap">
          <LuSparkles size={14} />
          <Text fz="sm" fw={600}>
            Similar
          </Text>
        </Group>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          radius="xl"
          aria-label="Close"
          onClick={() => session.similarAnchorId.set(null)}
        >
          <LuX />
        </ActionIcon>
      </Group>
      <Suspense
        fallback={
          <Center className={styles.fill}>
            <Loader size="sm" />
          </Center>
        }
      >
        <SimilarItems key={strip.card.id} editor={editor} card={strip.card} />
      </Suspense>
    </Paper>
  );
}

function SimilarItems(props: { editor: Editor; card: CardShape }) {
  const similar = useSimilarCards({ url: props.card.props.url });
  const urls = similar.data.pages.flatMap((p) => p.urls);

  if (!urls.length) {
    return (
      <Center className={styles.fill}>
        <Text fz="sm" c="dimmed">
          No similar cards found
        </Text>
      </Center>
    );
  }

  // A mouse wheel only scrolls vertically, so turn it sideways
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearEnd = el.scrollLeft + el.clientWidth > el.scrollWidth - 200;
    if (nearEnd && similar.hasNextPage && !similar.isFetchingNextPage) {
      similar.fetchNextPage();
    }
  };

  return (
    <div className={styles.row} onWheel={onWheel} onScroll={onScroll}>
      {urls.map((u) => (
        <PanelUrlCardItem
          key={u.url}
          editor={props.editor}
          url={u.url}
          metadata={u.metadata}
          anchorId={props.card.id}
        >
          <SimilarTile url={u.url} metadata={u.metadata} />
        </PanelUrlCardItem>
      ))}
      {similar.isFetchingNextPage && (
        <Center className={styles.more}>
          <Loader size="sm" />
        </Center>
      )}
    </div>
  );
}

function SimilarTile(props: { url: string; metadata?: Partial<UrlMetadata> }) {
  const m = props.metadata ?? {};
  return (
    <div className={styles.tile}>
      <AspectRatio ratio={1.91} className={styles.thumb}>
        {m.imageUrl ? (
          <Image
            src={m.imageUrl}
            alt=""
            fit="cover"
            h="100%"
            w="100%"
            draggable={false}
          />
        ) : (
          <Center c="dimmed">
            <LuGlobe size={20} />
          </Center>
        )}
      </AspectRatio>
      <Stack gap={2} p="xs">
        <Text c="gray" fz="xs" lineClamp={1}>
          {m.siteName || getDomain(props.url)}
        </Text>
        <Text c="bright" fw={600} fz="sm" lh={1.25} lineClamp={2}>
          {m.title || props.url}
        </Text>
      </Stack>
    </div>
  );
}
