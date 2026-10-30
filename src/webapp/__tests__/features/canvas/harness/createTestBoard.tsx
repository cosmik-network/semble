import './domShims';
import { IDBFactory } from 'fake-indexeddb';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  Box,
  Editor,
  EditorContext,
  TldrawUiContextProvider,
  createTLStore,
  defaultAddFontsFromNode,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  tipTapDefaultExtensions,
  useActions,
  getArrowBindings,
  type TLArrowShape,
  type TLFrameShape,
  type TLPointerEventInfo,
  type TLShapeId,
  type VecLike,
} from 'tldraw';
import {
  attachCanvasController,
  type CanvasController,
  type CanvasLoadStatus,
} from '@/features/canvas/controller/canvasController';
import { boardOverrides } from '@/features/canvas/components/boardEditor/boardOverrides';
import { TLDRAW_VERSION } from '@/features/canvas/storage/browserCanvasStorage';
import { IndexedDbCanvasStorage } from '@/features/canvas/storage/indexedDbCanvasStorage';
import {
  LinkCardShapeUtil,
  linkCardsOn,
  type LinkCardShape,
} from '@/features/canvas/shapes/linkCard/LinkCardShapeUtil';
import {
  collectionFrameMeta,
  frameFooter,
  type CollectionFrameFooter,
} from '@/features/canvas/model/collectionFrames';
import { CollectionFrameShapeUtil } from '@/features/canvas/shapes/collectionFrame/CollectionFrameShapeUtil';
import { ConnectionArrowShapeUtil } from '@/features/canvas/shapes/connectionArrow/ConnectionArrowShapeUtil';
import {
  arrowDisplay,
  type ArrowDisplay,
} from '@/features/canvas/shapes/connectionArrow/connectionArrows';
import { getShapeVisibility } from '@/features/canvas/shapes/shapeVisibility';
import type { SeedProgress } from '@/features/canvas/controller/linkSeed';
import { FakeLocks } from './fakeLocks';
import { FakeServer, VIEWER_DID } from './fakeServer';

export interface BoardArrow {
  id: TLShapeId;
  connectionId: string;
  from: TLShapeId | undefined;
  to: TLShapeId | undefined;
}

export interface TestBoard {
  editor: Editor;
  server: FakeServer;
  // This tab's query cache, which the cards read
  queryClient: QueryClient;
  storage: IndexedDbCanvasStorage;
  canvasId: string;
  // Turns to newer-version when a newer app's save stops this tab writing
  status: CanvasLoadStatus;
  // How many times another tab has taken the board over from this one
  timesTakenOver: number;
  // How many times pasted or dropped files were refused
  timesFilesRefused: number;
  // What the board said went wrong talking to the server
  serverErrors: string[];
  // Each step of starting the board from a link, as the loader shows it
  seedProgress: (SeedProgress | null)[];
  // Opens the same board in another tab, which shares the browser's
  // database and locks, and the server, but nothing else
  openInAnotherTab(): Promise<TestBoard>;
  // Storage for another tab with no board open, to act as some other app
  storageInAnotherTab(): IndexedDbCanvasStorage;
  // Makes this tab the board's writer when another tab holds it
  takeOver(): Promise<void>;
  // Drags with the current tool, in page coordinates at the default camera.
  // Holding Option clones what's dragged.
  drag(
    from: [number, number],
    to: [number, number],
    keys?: { altKey: boolean },
  ): void;
  // Presses and moves without letting go, so the drag is still under way.
  // The move lands a frame or more later.
  startDrag(from: [number, number], to: [number, number]): void;
  // Draws with the arrow tool, in page coordinates at the default camera
  drawArrow(from: [number, number], to: [number, number]): void;
  // The type picker that opens on an arrow drawn between two links
  connectionPicker: CanvasController['connectionPicker'];
  // The toast with Undo that follows a server write
  undoToast: CanvasController['undoToast'];
  // Changing, flipping and deleting the viewer's own connections
  connectionEdits: CanvasController['connectionEdits'];
  // Arrows the user drew that aren't connections
  sketchArrows(): TLArrowShape[];
  // Runs one of the board's actions as its keyboard shortcut would, e.g.
  // duplicate for Cmd+D
  runAction(id: string): void;
  actionIds(): string[];
  // Moves the pointer there without pressing, in page coordinates at the
  // default camera. The hovered shape changes a frame or more later.
  hover(at: [number, number]): void;
  // What tldraw's clipboard and drop handling pass on
  pasteUrl(url: string): Promise<void>;
  pasteText(text: string): Promise<void>;
  pasteFiles(files: File[]): Promise<void>;
  dropUrl(url: string, point: VecLike): Promise<void>;
  linkCards(): LinkCardShape[];
  // Collection frames and frames the user drew
  frames(): TLFrameShape[];
  // Load more and collapsing on collection frames
  collectionFrames: CanvasController['collectionFrames'];
  // What a collection frame's footer says, or null for a plain frame
  frameFooter(id: TLShapeId): CollectionFrameFooter | null;
  // The connection arrows drawn, each with the copies its ends are bound to
  arrows(): BoardArrow[];
  // Double-clicks with the select tool, in page coordinates at the default
  // camera
  doubleClick(at: [number, number]): void;
  // Quick-add as it shows: where a pick goes, and what picking does
  quickAdd: CanvasController['quickAdd'];
  // What each copy's badge and outline show
  copies: CanvasController['copies'];
  popupCard: CanvasController['popupCard'];
  // The link the board was opened from, and placing more of its ring
  linkSeed: CanvasController['linkSeed'];
  // Which cards show the media a label hides
  mediaReveals: CanvasController['mediaReveals'];
  // How arrows show: focus, hiding and their toggles
  arrowView: CanvasController['arrowView'];
  // Whether an arrow is drawn at full strength, and with its type pill
  arrowDisplay(id: TLShapeId): ArrowDisplay;
  // Runs the refresh due every ten minutes, as if that long had passed
  timedRefresh(): void;
  // Whether the header says refreshing failed
  refreshFailed: CanvasController['refreshFailed'];
  // Switches to another browser tab and back. Every board shares the one
  // page, so tests that hide it show it again before they end.
  hideTab(): void;
  showTab(): void;
  // Closes the board, saving it like navigating away would
  dispose(): Promise<void>;
}

interface Options {
  // Pass a previous board's storage and id to reopen it in the same tab
  storage?: IndexedDbCanvasStorage;
  canvasId?: string;
  server?: FakeServer;
  // Opens the board as "Open in canvas" on this link's or collection's
  // Semble page does
  seedUrl?: string;
  // The collection's id, which a collection page passes along with its URL
  seedCollectionId?: string;
}

function pointer(
  name: 'pointer_down' | 'pointer_move' | 'pointer_up',
  [x, y]: [number, number],
  altKey = false,
): TLPointerEventInfo {
  return {
    type: 'pointer',
    name,
    target: 'canvas',
    point: { x, y, z: 0.5 },
    pointerId: 1,
    button: 0,
    isPen: false,
    shiftKey: false,
    altKey,
    ctrlKey: false,
    metaKey: false,
    accelKey: false,
  };
}

// The board's actions, as <Tldraw> builds them from tldraw's and ours
function boardActions(editor: Editor, controller: CanvasController) {
  const wrapper = (props: { children: ReactNode }) => (
    <EditorContext value={editor}>
      <TldrawUiContextProvider overrides={boardOverrides(controller)}>
        {props.children}
      </TldrawUiContextProvider>
    </EditorContext>
  );
  return renderHook(() => useActions(), { wrapper });
}

interface Browser {
  indexedDB: IDBFactory;
  locks: FakeLocks;
}

const browsers = new WeakMap<IndexedDbCanvasStorage, Browser>();

function openTab(indexedDB: IDBFactory, locks: FakeLocks) {
  const storage = new IndexedDbCanvasStorage({
    indexedDB,
    locks,
    tldrawVersion: TLDRAW_VERSION,
  });
  browsers.set(storage, { indexedDB, locks });
  return storage;
}

// A headless editor with the same shapes, bindings and tools <Tldraw> registers
export async function createTestBoard(
  options: Options = {},
): Promise<TestBoard> {
  const shapeUtils = [
    ...defaultShapeUtils.filter(
      (util) => util.type !== 'arrow' && util.type !== 'frame',
    ),
    ConnectionArrowShapeUtil,
    CollectionFrameShapeUtil,
    LinkCardShapeUtil,
  ];
  const bindingUtils = [...defaultBindingUtils];
  const editor = new Editor({
    store: createTLStore({ shapeUtils, bindingUtils }),
    shapeUtils,
    bindingUtils,
    tools: [...defaultTools, ...defaultShapeTools],
    getContainer: () => document.body,
    getShapeVisibility,
    initialState: 'select',
    textOptions: {
      addFontsFromNode: defaultAddFontsFromNode,
      tipTapConfig: { extensions: tipTapDefaultExtensions },
    },
  });
  // jsdom has no layout, so the viewport is given a size
  editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
  // jsdom lays nothing out, so text measures as if every character were half
  // as wide as the font is high
  editor.textMeasure.measureText = (text, opts) => {
    const perLine = Math.floor(
      (opts.maxWidth ?? Infinity) / (opts.fontSize / 2),
    );
    const keepsBreaks = opts.otherStyles?.['white-space'] !== 'normal';
    const paragraphs = keepsBreaks ? text.split('\n') : [text];
    const lines = paragraphs.reduce(
      (sum, paragraph) =>
        sum + Math.max(1, Math.ceil(paragraph.length / perLine)),
      0,
    );
    const h = lines * opts.fontSize * opts.lineHeight;
    return { x: 0, y: 0, w: opts.maxWidth ?? 0, h, scrollWidth: 0 };
  };
  // A headless editor can't draw an export, so this stands in for one
  editor.toImage = async () => ({
    blob: new Blob(['board'], { type: 'image/jpeg' }),
    width: 1,
    height: 1,
  });
  const server = options.server ?? new FakeServer();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const storage = options.storage ?? openTab(new IDBFactory(), new FakeLocks());
  const canvasId = options.canvasId ?? crypto.randomUUID();
  const storageInAnotherTab = () => {
    const browser = browsers.get(storage)!;
    return openTab(browser.indexedDB, browser.locks);
  };
  let disposed = false;
  // Filled in below. Starting a board from a link can report errors before
  // it has loaded; the other callbacks only run once it has.
  const board = {
    serverErrors: [] as string[],
    seedProgress: [] as (SeedProgress | null)[],
  } as TestBoard;
  let timedRefresh = () => {};
  const controller = attachCanvasController({
    editor,
    server,
    queryClient,
    storage,
    canvasId,
    seedUrl: options.seedUrl,
    seedCollectionId: options.seedCollectionId,
    ownerDid: VIEWER_DID,
    onStorageError: (error) => {
      throw error;
    },
    onTakenOver: () => board.timesTakenOver++,
    onFilesRefused: () => board.timesFilesRefused++,
    onServerError: (message) => board.serverErrors.push(message),
    onSeedProgress: (progress) => board.seedProgress.push(progress),
    onWritingAgain: () => {},
    onNewerVersion: () => (board.status = 'newer-version'),
    everyTimedRefresh(refresh) {
      timedRefresh = refresh;
      return () => (timedRefresh = () => {});
    },
  });

  const actions = boardActions(editor, controller);

  return Object.assign(board, {
    editor,
    server,
    queryClient,
    storage,
    canvasId,
    status: await controller.loaded,
    timesTakenOver: 0,
    timesFilesRefused: 0,
    serverErrors: board.serverErrors,
    seedProgress: board.seedProgress,
    openInAnotherTab: () =>
      createTestBoard({ storage: storageInAnotherTab(), canvasId, server }),
    storageInAnotherTab,
    takeOver: () => controller.takeOver(),
    drag(from, to, keys) {
      const altKey = keys?.altKey ?? false;
      editor
        .dispatch(pointer('pointer_down', from, altKey))
        .dispatch(pointer('pointer_move', to, altKey))
        .dispatch(pointer('pointer_up', to, altKey));
    },
    drawArrow(from, to) {
      editor.setCurrentTool('arrow');
      board.drag(from, to);
    },
    connectionPicker: controller.connectionPicker,
    undoToast: controller.undoToast,
    connectionEdits: controller.connectionEdits,
    sketchArrows: () =>
      editor
        .getCurrentPageShapes()
        .filter(
          (shape): shape is TLArrowShape =>
            shape.type === 'arrow' && !shape.meta.connectionId,
        ),
    startDrag(from, to) {
      editor
        .dispatch(pointer('pointer_down', from))
        .dispatch(pointer('pointer_move', to));
    },
    hover(at) {
      editor.dispatch(pointer('pointer_move', at));
    },
    runAction(id) {
      actions.result.current[id].onSelect('kbd');
    },
    actionIds: () => Object.keys(actions.result.current),
    pasteUrl: (url) => editor.putExternalContent({ type: 'url', url }),
    pasteText: (text) => editor.putExternalContent({ type: 'text', text }),
    pasteFiles: (files) => editor.putExternalContent({ type: 'files', files }),
    dropUrl: (url, point) =>
      editor.putExternalContent({ type: 'url', url, point }),
    doubleClick(at) {
      for (let i = 0; i < 2; i++) {
        editor
          .dispatch(pointer('pointer_down', at))
          .dispatch(pointer('pointer_up', at));
      }
    },
    quickAdd: controller.quickAdd,
    copies: controller.copies,
    popupCard: controller.popupCard,
    linkSeed: controller.linkSeed,
    mediaReveals: controller.mediaReveals,
    arrowView: controller.arrowView,
    arrowDisplay: (id) => arrowDisplay(editor, editor.getShape(id)!),
    timedRefresh: () => timedRefresh(),
    refreshFailed: controller.refreshFailed,
    hideTab: () => focusManager.setFocused(false),
    showTab: () => focusManager.setFocused(true),
    linkCards: () => linkCardsOn(editor),
    frames: () =>
      editor
        .getCurrentPageShapes()
        .filter((shape): shape is TLFrameShape => shape.type === 'frame'),
    collectionFrames: controller.collectionFrames,
    frameFooter(id) {
      const meta = collectionFrameMeta(editor.getShape(id)!.meta);
      return meta && frameFooter(meta);
    },
    arrows: () =>
      editor
        .getCurrentPageShapes()
        .filter(
          (shape): shape is TLArrowShape =>
            shape.type === 'arrow' && !!shape.meta.connectionId,
        )
        .map((arrow) => {
          const bindings = getArrowBindings(editor, arrow);
          return {
            id: arrow.id,
            connectionId: arrow.meta.connectionId as string,
            from: bindings.start?.toId,
            to: bindings.end?.toId,
          };
        }),
    async dispose() {
      if (disposed) return;
      disposed = true;
      actions.unmount();
      await controller.detach();
      editor.dispose();
    },
  } satisfies TestBoard);
}
