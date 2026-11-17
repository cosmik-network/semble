import { atom, type Editor, type TLClickEventInfo, type VecLike } from 'tldraw';
import { linkKey } from '../model/linkCards';
import type { SearchScope } from '../server/canvasServer';
import type { CollectionToOpen } from './collectionFrames';

interface SelectIdle {
  handleDoubleClickOnCanvas(info: TLClickEventInfo): void;
}

export interface QuickAddDeps {
  placeLink(url: string, point: VecLike): void;
  placeCollection(target: CollectionToOpen, point: VecLike): void;
}

export type QuickAddKind = 'cards' | 'collections';

export interface QuickAddCreating {
  name: string;
  point: VecLike;
}

// Quick-add places a pasted or searched link or collection where it was
// opened: the double-click point, or the centre of the view for /
export function attachQuickAdd(editor: Editor, deps: QuickAddDeps) {
  // Where the pick goes, or null while quick-add is closed
  const placeAt = atom<VecLike | null>('quick-add', null);
  // Kept across openings while the board is open
  const scope = atom<SearchScope>('quick-add scope', 'mine');
  const kind = atom<QuickAddKind>('quick-add kind', 'cards');
  // A collection being created from quick-add, placed once it exists
  const creating = atom<QuickAddCreating | null>('quick-add creating', null);

  function open(point?: VecLike) {
    if (editor.getIsReadonly() || creating.get()) return;
    placeAt.set(point ?? editor.getViewportPageBounds().center);
  }

  // Closes quick-add, with where the pick goes
  function take() {
    const point = placeAt.get();
    if (!point || editor.getIsReadonly()) return null;
    placeAt.set(null);
    return point;
  }

  // tldraw creates a text shape on a double-click on empty canvas. It calls
  // this for double-clicks on shapes that can't be edited too, with the
  // shape as target, and those open nothing.
  const idle = editor.getStateDescendant(
    'select.idle',
  ) as unknown as SelectIdle;
  const originalDoubleClick = idle.handleDoubleClickOnCanvas;
  idle.handleDoubleClickOnCanvas = (info) => {
    if (info.target === 'canvas') open({ ...editor.inputs.currentPagePoint });
  };

  return {
    placeAt,
    open: () => open(),
    close: () => placeAt.set(null),
    scope,
    setScope: (next: SearchScope) => scope.set(next),
    kind,
    setKind: (next: QuickAddKind) => kind.set(next),
    // Text that isn't a link is a search, and leaves quick-add open
    place(input: string) {
      const url = linkKey(input);
      if (!url) return;
      const point = take();
      if (point) deps.placeLink(url, point);
    },
    placeCollection(collectionId: string) {
      const point = take();
      if (point) deps.placeCollection({ id: collectionId }, point);
    },
    creating,
    // Closes quick-add and keeps its point for the collection to come
    startCreate(name: string) {
      const point = take();
      // The form's limit, which it doesn't check on a prefilled name
      if (point) creating.set({ name: name.slice(0, 100), point });
    },
    finishCreate(collectionId: string) {
      const pending = creating.get();
      creating.set(null);
      if (pending && !editor.getIsReadonly()) {
        deps.placeCollection({ id: collectionId }, pending.point);
      }
    },
    cancelCreate: () => creating.set(null),
    detach() {
      idle.handleDoubleClickOnCanvas = originalDoubleClick;
      placeAt.set(null);
      creating.set(null);
    },
  };
}

export type QuickAdd = ReturnType<typeof attachQuickAdd>;
