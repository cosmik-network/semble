import { atom, type Editor, type TLClickEventInfo, type VecLike } from 'tldraw';
import { linkKey } from '../model/linkCards';
import type { SearchScope } from '../server/canvasServer';

interface SelectIdle {
  handleDoubleClickOnCanvas(info: TLClickEventInfo): void;
}

// Quick-add places a pasted or searched link where it was opened: the
// double-click point, or the centre of the view for /
export function attachQuickAdd(
  editor: Editor,
  placeLink: (url: string, point: VecLike) => void,
) {
  // Where the picked link goes, or null while quick-add is closed
  const placeAt = atom<VecLike | null>('quick-add', null);
  // Kept across openings while the board is open
  const scope = atom<SearchScope>('quick-add scope', 'mine');

  function open(point?: VecLike) {
    if (editor.getIsReadonly()) return;
    placeAt.set(point ?? editor.getViewportPageBounds().center);
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
    // Text that isn't a link is a search, and leaves quick-add open
    place(input: string) {
      const point = placeAt.get();
      const url = linkKey(input);
      if (!point || !url || editor.getIsReadonly()) return;
      placeAt.set(null);
      placeLink(url, point);
    },
    detach() {
      idle.handleDoubleClickOnCanvas = originalDoubleClick;
      placeAt.set(null);
    },
  };
}

export type QuickAdd = ReturnType<typeof attachQuickAdd>;
