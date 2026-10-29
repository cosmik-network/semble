import { computed, type Editor } from 'tldraw';
import { LINK_CARD_TYPE } from '../model/linkCards';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';

// The link the selection popup is for: exactly one selected card, and none
// while it's being dragged or a menu or modal is open
export function createPopupLink(editor: Editor) {
  return computed<string | null>('popup link', () => {
    if (!editor.isInAny('select.idle', 'select.pointing_shape')) return null;
    if (editor.menus.hasOpenMenus()) return null;
    const shape = editor.getOnlySelectedShape();
    if (!shape || !editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE))
      return null;
    return shape.props.url;
  });
}
