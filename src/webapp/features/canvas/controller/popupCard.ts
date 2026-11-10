import { computed, type Editor, type TLShapeId } from 'tldraw';
import { LINK_CARD_TYPE } from '../model/linkCards';
import {
  collectionFrameOf,
  type CollectionPageUrl,
} from '../model/collectionFrames';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';

// For a collection, url is its Semble page, which its connections name
export interface PopupCard {
  id: TLShapeId;
  kind: 'link' | 'collection';
  url: string;
}

// The card or collection frame the selection popup is for: exactly one
// selected, and none while it's being dragged or a menu or modal is open
export function createPopupCard(
  editor: Editor,
  collectionPageUrl: CollectionPageUrl,
) {
  return computed<PopupCard | null>(
    'popup card',
    () => {
      if (!editor.isInAny('select.idle', 'select.pointing_shape')) return null;
      if (editor.menus.hasOpenMenus()) return null;
      const shape = editor.getOnlySelectedShape();
      if (!shape) return null;
      if (editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE)) {
        return { id: shape.id, kind: 'link', url: shape.props.url };
      }
      const frame = collectionFrameOf(shape);
      if (frame) {
        return {
          id: shape.id,
          kind: 'collection',
          url: collectionPageUrl(frame.collection),
        };
      }
      return null;
    },
    // A new object each time, which shouldn't redraw the popup on its own
    {
      isEqual: (a, b) => a === b || (a?.id === b?.id && a?.url === b?.url),
    },
  );
}
