import { computed, type Editor, type TLShapeId } from 'tldraw';
import { LINK_CARD_TYPE } from '../model/linkCards';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';

export interface PopupCard {
  id: TLShapeId;
  url: string;
}

// The card the selection popup is for: exactly one selected card, and none
// while it's being dragged or a menu or modal is open
export function createPopupCard(editor: Editor) {
  return computed<PopupCard | null>(
    'popup card',
    () => {
      if (!editor.isInAny('select.idle', 'select.pointing_shape')) return null;
      if (editor.menus.hasOpenMenus()) return null;
      const shape = editor.getOnlySelectedShape();
      if (
        !shape ||
        !editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE)
      ) {
        return null;
      }
      return { id: shape.id, url: shape.props.url };
    },
    // A new object each time, which shouldn't redraw the popup on its own
    {
      isEqual: (a, b) => a === b || (a?.id === b?.id && a?.url === b?.url),
    },
  );
}
