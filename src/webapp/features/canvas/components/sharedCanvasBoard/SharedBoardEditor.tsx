'use client';

import 'tldraw/tldraw.css';
import {
  Badge,
  Button,
  Center,
  Group,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { useComputedColorScheme } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Editor,
  Tldraw,
  loadSnapshot,
  type TLComponents,
  type TLShapeId,
  type TLStoreSnapshot,
} from 'tldraw';
import { createSembleClient } from '@/services/client.apiClient';
import { getCollectionPageUrl } from '@/lib/utils/link';
import type { User } from '@semble/types';
import CardAuthorRow from '@/features/cards/components/cardAuthorRow/CardAuthorRow';
import { attachArrows } from '../../controller/arrows';
import type { ConnectionEnd, FetchedConnections } from '../../model/arrows';
import { collectionFrameOf } from '../../model/collectionFrames';
import { LINK_CARD_TYPE } from '../../model/linkCards';
import { CanvasCollectionFramesProvider } from '../../lib/canvasCollectionFramesContext';
import { CanvasCopiesProvider } from '../../lib/canvasCopiesContext';
import { CanvasMediaRevealsProvider } from '../../lib/canvasMediaRevealsContext';
import { CanvasServerProvider } from '../../lib/canvasServerContext';
import { sharedCanvasServer } from '../../server/sharedCanvasServer';
import { CollectionFrameShapeUtil } from '../../shapes/collectionFrame/CollectionFrameShapeUtil';
import { ConnectionArrowShapeUtil } from '../../shapes/connectionArrow/ConnectionArrowShapeUtil';
import { getShapeVisibility } from '../../shapes/shapeVisibility';
import {
  LinkCardShapeUtil,
  type LinkCardShape,
} from '../../shapes/linkCard/LinkCardShapeUtil';
import { isNewerSchema } from '../../storage/indexedDbCanvasStorage';
import CanvasBoardSkeleton from '../canvasBoard/Skeleton.CanvasBoard';
import { DEFAULT_CANVAS_NAME } from '../../storage/canvasStorage';

// tldraw's licence forbids hiding, covering or restyling the "Made with
// tldraw" watermark, or interfering with licence key validation, which decides
// whether it shows. See TLDRAW-LICENSE.md.

const shapeUtils = [
  LinkCardShapeUtil,
  ConnectionArrowShapeUtil,
  CollectionFrameShapeUtil,
];

// The shapes a connection can end on, straight from the loaded document: link
// copies grouped by URL, and each collection frame by its collection's page
function connectionEndsOf(editor: Editor): ConnectionEnd[] {
  const byUrl = new Map<string, string[]>();
  const add = (url: string, id: TLShapeId) => {
    const ids = byUrl.get(url) ?? [];
    ids.push(id);
    byUrl.set(url, ids);
  };
  for (const shape of editor.getCurrentPageShapes()) {
    if (shape.type === LINK_CARD_TYPE) {
      add((shape as LinkCardShape).props.url, shape.id);
      continue;
    }
    const frame = collectionFrameOf(shape);
    if (frame) add(getCollectionPageUrl(frame.collection), shape.id);
  }
  return Array.from(byUrl, ([url, shapeIds]) => ({ url, shapeIds }));
}

function SharedHeader(props: { name: string; author: User | null }) {
  return (
    <Paper
      withBorder
      shadow="sm"
      radius="lg"
      p={'xs'}
      pr="sm"
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Stack gap={4}>
        <Group gap="xs" wrap="nowrap">
          <Text fw={700} truncate maw={320}>
            {props.name}
          </Text>
          <Badge variant="light" size="sm" radius="xl">
            View only
          </Badge>
        </Group>
        {props.author && <CardAuthorRow author={props.author} />}
      </Stack>
    </Paper>
  );
}

type Status = 'loading' | 'ready' | 'newer-version' | 'missing' | 'failed';

export default function SharedBoardEditor(props: { shareToken: string }) {
  const colorScheme = useComputedColorScheme();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [name, setName] = useState<string | null>(null);

  const opened = useQuery({
    queryKey: ['canvas', 'shared', props.shareToken],
    queryFn: () => createSembleClient().canvas.openShared(props.shareToken),
  });

  // The board's owner, resolved through the public profile route. A failure
  // just leaves the row out
  const author = useQuery({
    queryKey: ['canvas', 'shared-author', opened.data?.record.ownerDid],
    queryFn: () =>
      createSembleClient().getProfile({
        identifier: opened.data!.record.ownerDid,
      }),
    enabled: !!opened.data,
    retry: false,
    staleTime: Infinity,
  });

  const components = useMemo<TLComponents>(
    () => ({
      MenuPanel: () => (
        <SharedHeader
          name={name ?? DEFAULT_CANVAS_NAME}
          author={author.data ?? null}
        />
      ),
      // A shared board has one page and no quick add
      NavigationPanel: () => null,
    }),
    [name, author.data],
  );

  useEffect(() => {
    if (opened.isError) {
      // A revoked, mistyped or never-existed token
      setStatus('missing');
    }
  }, [opened.isError]);

  useEffect(() => {
    if (!editor || !opened.data) return;
    const { record, document } = opened.data;
    // Showing it would take migrating down, which tldraw can't do
    if (
      document &&
      isNewerSchema(document.schema, editor.store.schema.serialize())
    ) {
      setStatus('newer-version');
      return;
    }
    setName(record.name);
    loadSnapshot(editor.store, {
      document: (document ?? undefined) as TLStoreSnapshot | undefined,
    });
    editor.clearHistory();
    editor.updateInstanceState({ isReadonly: true });
    editor.zoomToFit({ animation: { duration: 0 } });
    setStatus('ready');

    // Arrows follow from the links' connections, never from the document, so
    // they're drawn here like a reading tab draws its own
    const fetched = new Map<string, FetchedConnections>();
    const arrows = attachArrows({
      editor,
      // The owner's own connections draw solid, as on their board
      viewerDid: record.ownerDid,
      ends: () => connectionEndsOf(editor),
      fetchedConnections: () => fetched,
    });
    const urls = Array.from(
      new Set(connectionEndsOf(editor).map((end) => end.url)),
    );
    let detached = false;
    void sharedCanvasServer.getLinks(urls).then((links) => {
      if (detached) return;
      links.forEach((link, url) => {
        if (link.connections) {
          fetched.set(url, {
            connections: link.connections,
            fetchedAt: Date.now(),
          });
        }
      });
      arrows.reconcile();
    });
    // Frames count as ends only once their meta has been placed, which it is
    // in a saved document; still, a frame's links arrive with the rest
    return () => {
      detached = true;
      arrows.detach();
    };
  }, [editor, opened.data]);

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme });
  }, [editor, colorScheme]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        <CanvasServerProvider server={sharedCanvasServer}>
          <CanvasCopiesProvider copies={null}>
            <CanvasMediaRevealsProvider mediaReveals={null}>
              <CanvasCollectionFramesProvider collectionFrames={null}>
                <Tldraw
                  licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
                  shapeUtils={shapeUtils}
                  getShapeVisibility={getShapeVisibility}
                  components={components}
                  onMount={setEditor}
                />
              </CanvasCollectionFramesProvider>
            </CanvasMediaRevealsProvider>
          </CanvasCopiesProvider>
        </CanvasServerProvider>
      </div>
      {status === 'loading' && <CanvasBoardSkeleton />}
      {status !== 'ready' && status !== 'loading' && (
        <Center pos="absolute" inset={0} bg="var(--mantine-color-body)">
          <Stack align="center" gap="sm">
            <Text fw={500}>
              {status === 'newer-version'
                ? 'This canvas was saved by a newer version of Semble.'
                : status === 'missing'
                  ? "This link isn't valid, or sharing was turned off."
                  : "Couldn't open this canvas."}
            </Text>
            {status === 'failed' && (
              <Button onClick={() => window.location.reload()}>Reload</Button>
            )}
          </Stack>
        </Center>
      )}
    </div>
  );
}
