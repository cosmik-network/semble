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
  type TLPointerEventInfo,
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
import { FakeLocks } from './fakeLocks';
import { FakeServer } from './fakeServer';

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
  // Double-clicks with the select tool, in page coordinates at the default
  // camera
  doubleClick(at: [number, number]): void;
  // Quick-add as it shows: where a pick goes, and what picking does
  quickAdd: CanvasController['quickAdd'];
  // What each copy's badge and outline show
  copies: CanvasController['copies'];
  popupLink: CanvasController['popupLink'];
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
  const shapeUtils = [...defaultShapeUtils, LinkCardShapeUtil];
  const bindingUtils = [...defaultBindingUtils];
  const editor = new Editor({
    store: createTLStore({ shapeUtils, bindingUtils }),
    shapeUtils,
    bindingUtils,
    tools: [...defaultTools, ...defaultShapeTools],
    getContainer: () => document.body,
    initialState: 'select',
    textOptions: {
      addFontsFromNode: defaultAddFontsFromNode,
      tipTapConfig: { extensions: tipTapDefaultExtensions },
    },
  });
  // jsdom has no layout, so the viewport is given a size
  editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
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
  // Filled in below; the controller's callbacks only run once it has loaded
  const board = {} as TestBoard;
  let timedRefresh = () => {};
  const controller = attachCanvasController({
    editor,
    server,
    queryClient,
    storage,
    canvasId,
    ownerDid: 'did:plc:tester',
    onStorageError: (error) => {
      throw error;
    },
    onTakenOver: () => board.timesTakenOver++,
    onFilesRefused: () => board.timesFilesRefused++,
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
    popupLink: controller.popupLink,
    timedRefresh: () => timedRefresh(),
    refreshFailed: controller.refreshFailed,
    hideTab: () => focusManager.setFocused(false),
    showTab: () => focusManager.setFocused(true),
    linkCards: () => linkCardsOn(editor),
    async dispose() {
      if (disposed) return;
      disposed = true;
      actions.unmount();
      await controller.detach();
      editor.dispose();
    },
  } satisfies TestBoard);
}
