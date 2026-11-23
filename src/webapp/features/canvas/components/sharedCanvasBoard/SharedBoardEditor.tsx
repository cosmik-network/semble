'use client';

import 'tldraw/tldraw.css';
import { Button, Center, Stack, Text } from '@mantine/core';
import { useComputedColorScheme } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Editor,
  Tldraw,
  createShapeId,
  loadSnapshot,
  type TLComponents,
  type TLShapeId,
  type TLStoreSnapshot,
} from 'tldraw';
import { createSembleClient } from '@/services/client.apiClient';
import { getCollectionPageUrl } from '@/lib/utils/link';
import { attachArrows } from '../../controller/arrows';
import {
  attachCollectionFrames,
  type CollectionFrames,
} from '../../controller/collectionFrames';
import { combineOutcomes, type FetchOutcome } from '../../controller/linkCards';
import { createMediaReveals } from '../../controller/mediaReveals';
import { createPopupCard } from '../../controller/popupCard';
import type { ConnectionEnd, FetchedConnections } from '../../model/arrows';
import { collectionFrameOf } from '../../model/collectionFrames';
import {
  ENTRY_META_KEY,
  LINK_CARD_TYPE,
  LINK_CARD_WIDTH,
  linkCardHeight,
  linkCardParts,
} from '../../model/linkCards';
import { canvasKeys } from '../../lib/canvasKeys';
import { jsonMeta } from '../../lib/jsonMeta';
import { createLineCounter } from '../../lib/lineCounter';
import { showCanvasError } from '../../lib/showCanvasError';
import { CanvasCollectionFramesProvider } from '../../lib/canvasCollectionFramesContext';
import { CanvasCopiesProvider } from '../../lib/canvasCopiesContext';
import { CanvasMediaRevealsProvider } from '../../lib/canvasMediaRevealsContext';
import { CanvasServerProvider } from '../../lib/canvasServerContext';
import { linkQuery, type LinkInfo } from '../../server/canvasServer';
import { sharedCanvasServer } from '../../server/sharedCanvasServer';
import { CollectionFrameShapeUtil } from '../../shapes/collectionFrame/CollectionFrameShapeUtil';
import { attachBoardExports } from '../../controller/boardExports';
import { ConnectionArrowShapeUtil } from '../../shapes/connectionArrow/ConnectionArrowShapeUtil';
import { getShapeVisibility } from '../../shapes/shapeVisibility';
import {
  LinkCardShapeUtil,
  type LinkCardShape,
} from '../../shapes/linkCard/LinkCardShapeUtil';
import { isNewerSchema } from '../../storage/indexedDbCanvasStorage';
import SharedCanvasBoardSkeleton from './Skeleton.SharedCanvasBoard';
import { DEFAULT_CANVAS_NAME } from '../../storage/canvasStorage';
import SharedHeader from '../sharedHeader/SharedHeader';
import SharedLogoCard from '../sharedHeader/SharedLogoCard';
import SelectedArrowPill from '../arrowPill/SelectedArrowPill';
import BoardNavigation, {
  ShowUiButton,
} from '../boardNavigation/BoardNavigation';
import SharedSelectionPopup from './SharedSelectionPopup';

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

type Status = 'loading' | 'ready' | 'newer-version' | 'missing';

export default function SharedBoardEditor(props: { shareToken: string }) {
  const colorScheme = useComputedColorScheme();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [arrowView, setArrowView] = useState<
    ReturnType<typeof attachArrows>['view'] | null
  >(null);
  const [mediaReveals] = useState(createMediaReveals);
  const [collectionFrames, setCollectionFrames] =
    useState<CollectionFrames | null>(null);
  const queryClient = useQueryClient();
  const popupCard = useMemo(
    () => (editor ? createPopupCard(editor, getCollectionPageUrl) : null),
    [editor],
  );

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

  const name = opened.data?.record.name ?? DEFAULT_CANVAS_NAME;
  const title = useRef(name);
  useEffect(() => {
    title.current = name;
  }, [name]);
  const onMount = useCallback((mounted: Editor) => {
    attachBoardExports(mounted, () => title.current);
    setEditor(mounted);
  }, []);
  const components = useMemo<TLComponents>(
    () => ({
      MenuPanel: () => (
        <SharedHeader name={name} author={author.data ?? null} />
      ),
      SharePanel: SharedLogoCard,
      // Quick add stays out on a read-only board
      NavigationPanel: () => (
        <BoardNavigation arrowView={arrowView} quickAdd={null} />
      ),
      Overlays: SelectedArrowPill,
    }),
    [name, author.data, arrowView],
  );

  // Showing it would take migrating down, which tldraw can't do
  const tooNew = useMemo(() => {
    const document = opened.data?.document;
    return (
      !!editor &&
      !!document &&
      isNewerSchema(document.schema, editor.store.schema.serialize())
    );
  }, [editor, opened.data]);

  // A revoked, mistyped or never-existed token reads as missing
  const status: Status = opened.isError
    ? 'missing'
    : tooNew
      ? 'newer-version'
      : loaded
        ? 'ready'
        : 'loading';

  useEffect(() => {
    if (!editor || !opened.data || tooNew) return;
    const { record, document } = opened.data;
    loadSnapshot(editor.store, {
      document: (document ?? undefined) as TLStoreSnapshot | undefined,
    });
    editor.clearHistory();
    editor.updateInstanceState({ isReadonly: true });
    editor.zoomToFit({ animation: { duration: 0 } });
    // Mirrors the store we just loaded into, so the skeleton can go
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);

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
    setArrowView(arrows.view);
    let detached = false;

    // Through the cache the cards read, so a card and its arrows share a fetch
    async function fetchLinks(urls: string[]): Promise<FetchOutcome> {
      const outcomes = await Promise.all(
        urls.map(async (url): Promise<FetchOutcome> => {
          try {
            const link = await queryClient.fetchQuery(
              linkQuery(sharedCanvasServer, url),
            );
            if (link.connections) {
              fetched.set(url, {
                connections: link.connections,
                fetchedAt: Date.now(),
              });
            }
            return 'fetched';
          } catch (error) {
            console.warn(error);
            return 'failed';
          }
        }),
      );
      if (!detached) arrows.reconcile();
      return combineOutcomes(outcomes);
    }
    void fetchLinks(
      Array.from(new Set(connectionEndsOf(editor).map((end) => end.url))),
    );

    // Loading more is the one change a viewer makes, and only in their tab
    const lines = createLineCounter(editor);
    const cardHeight: Parameters<
      typeof attachCollectionFrames
    >[0]['cardHeight'] = (url, entry) =>
      linkCardHeight(
        linkCardParts(
          queryClient.getQueryData<LinkInfo>(canvasKeys.link(url)),
          lines.count,
          entry,
        ),
      );
    const frames = attachCollectionFrames({
      editor,
      server: sharedCanvasServer,
      viewerDid: record.ownerDid,
      collectionPageUrl: getCollectionPageUrl,
      fetchLinks,
      cardHeight,
      // Loading more fetches the links before placing them, so each card is
      // placed at its height
      placeLinks(places) {
        const cards = places.map((place) => {
          const h = cardHeight(place.url, place.entry?.card ?? null);
          return {
            id: place.id ?? createShapeId(),
            type: LINK_CARD_TYPE,
            x: place.at.x - LINK_CARD_WIDTH / 2,
            y: place.at.y - h / 2,
            props: { url: place.url, h, cardId: place.entry?.cardId ?? null },
            ...(place.entry && {
              meta: { [ENTRY_META_KEY]: jsonMeta(place.entry.card) },
            }),
          };
        });
        editor.createShapes(cards);
        return cards.map((card) => card.id);
      },
      placeLink: () => {},
      countLines: lines.count,
      rename: async () => {},
      onFailed: showCanvasError,
      onAlreadyInCollection: () => {},
      onProgress: () => {},
      canPlace: () => !detached,
      writeReadonly(change) {
        editor.updateInstanceState({ isReadonly: false });
        try {
          change();
        } finally {
          editor.updateInstanceState({ isReadonly: true });
        }
      },
    });
    setCollectionFrames(frames);

    return () => {
      detached = true;
      setArrowView(null);
      setCollectionFrames(null);
      frames.detach();
      arrows.detach();
    };
  }, [editor, opened.data, tooNew, queryClient]);

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme });
  }, [editor, colorScheme]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
        <CanvasServerProvider server={sharedCanvasServer}>
          <CanvasCopiesProvider copies={null}>
            <CanvasMediaRevealsProvider mediaReveals={mediaReveals}>
              <CanvasCollectionFramesProvider
                collectionFrames={collectionFrames}
              >
                <Tldraw
                  licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
                  shapeUtils={shapeUtils}
                  getShapeVisibility={getShapeVisibility}
                  components={components}
                  onMount={onMount}
                >
                  <ShowUiButton />
                  {popupCard && <SharedSelectionPopup popupCard={popupCard} />}
                </Tldraw>
              </CanvasCollectionFramesProvider>
            </CanvasMediaRevealsProvider>
          </CanvasCopiesProvider>
        </CanvasServerProvider>
      </div>
      {status === 'loading' && <SharedCanvasBoardSkeleton />}
      {status !== 'ready' && status !== 'loading' && (
        <Center pos="absolute" inset={0} bg="var(--mantine-color-body)">
          <Stack align="center" gap="sm">
            <Text fw={500}>
              {status === 'newer-version'
                ? 'This canvas was saved by a newer version of Semble.'
                : "This link isn't valid, or sharing was turned off."}
            </Text>
          </Stack>
        </Center>
      )}
    </div>
  );
}
