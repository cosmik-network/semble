'use client';

import { Center, Loader, Paper, Text } from '@mantine/core';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createShapeId, type Editor } from 'tldraw';
import { useAuth } from '@/hooks/useAuth';
import type { DetailLevel } from '../model/detailLevel';
import { LINK_CARD_TYPE } from '../model/linkCards';
import { detailLevel } from '../shapes/detailLevel';
import { linkCardsOn } from '../shapes/linkCard/LinkCardShapeUtil';
import { STRESS_CANVAS_ID } from '../lib/constants';
import { stressPlacements } from './stressData';
import { stressCanvasServer } from './stressCanvasServer';

const BoardEditor = dynamic(
  () => import('../components/boardEditor/BoardEditor'),
  { ssr: false },
);

// The cards go on an empty board; arrows follow from the server's connections
function placeCards(editor: Editor) {
  if (linkCardsOn(editor).length > 0) return;
  editor.run(
    () =>
      editor.createShapes(
        stressPlacements().map((place) => ({
          id: createShapeId(),
          type: LINK_CARD_TYPE,
          x: place.x,
          y: place.y,
          props: { url: place.url },
        })),
      ),
    { history: 'ignore' },
  );
  editor.zoomToFit();
}

interface FrameStats {
  fps: number;
  longestFrameMs: number;
}

interface ShapeCounts {
  shapes: number;
  culled: number;
  mounted: number;
  mountedHidden: number;
  level: DetailLevel;
}

// Shows whether shapes off screen stay in the DOM
function countShapes(editor: Editor): ShapeCounts {
  const mounted = Array.from(
    document.querySelectorAll<HTMLElement>('.tl-shape'),
  );
  return {
    shapes: editor.getCurrentPageShapeIds().size,
    culled: editor.getCulledShapes().size,
    mounted: mounted.length,
    mountedHidden: mounted.filter((el) => el.style.display === 'none').length,
    level: detailLevel(editor),
  };
}

interface StatsProps {
  editor: Editor;
}

// Its own component, so updating it doesn't re-render the board
function Stats(props: StatsProps) {
  const [frames, setFrames] = useState<FrameStats | null>(null);
  const [counts, setCounts] = useState<ShapeCounts | null>(null);
  const editor = props.editor;

  useEffect(() => {
    let frameCount = 0;
    let longest = 0;
    let last = performance.now();
    let windowStart = last;
    let raf = requestAnimationFrame(function tick(now) {
      frameCount++;
      longest = Math.max(longest, now - last);
      last = now;
      if (now - windowStart >= 1000) {
        setFrames({
          fps: Math.round((frameCount * 1000) / (now - windowStart)),
          longestFrameMs: Math.round(longest),
        });
        // Walking the DOM mid-gesture would itself show as a long frame
        if (editor.getCameraState() === 'idle') setCounts(countShapes(editor));
        frameCount = 0;
        longest = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [editor]);

  if (!frames) return null;

  return (
    <Paper
      withBorder
      p="xs"
      pos="fixed"
      top={60}
      right={8}
      style={{ zIndex: 1000, pointerEvents: 'none' }}
    >
      <Text ff="monospace" fz="xs">
        {frames.fps} fps · longest frame {frames.longestFrameMs} ms
      </Text>
      {counts && (
        <>
          <Text ff="monospace" fz="xs">
            {counts.shapes} shapes · {counts.culled} culled · {counts.level}
          </Text>
          <Text ff="monospace" fz="xs">
            {counts.mounted} in DOM · {counts.mountedHidden} hidden
          </Text>
        </>
      )}
    </Paper>
  );
}

export default function StressBoard() {
  const { user } = useAuth();
  const viewerDid = user?.id;
  const server = useMemo(
    () => (viewerDid ? stressCanvasServer(viewerDid) : null),
    [viewerDid],
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  // Stable, or the board would reattach on every render
  const onLoaded = useCallback((loaded: Editor) => {
    placeCards(loaded);
    setEditor(loaded);
  }, []);

  if (!server) {
    return (
      <Center h="100dvh">
        <Loader />
      </Center>
    );
  }

  return (
    <>
      <BoardEditor
        canvasId={STRESS_CANVAS_ID}
        server={server}
        onLoaded={onLoaded}
      />
      {editor && <Stats editor={editor} />}
    </>
  );
}
