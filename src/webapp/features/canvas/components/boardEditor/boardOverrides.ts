import type { TLUiOverrides } from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';
import { isBoardTool } from '../../model/boardTools';

// Removing tools here also removes their keyboard shortcuts
export function boardOverrides(
  controller: CanvasController | null,
): TLUiOverrides {
  return {
    tools(_editor, tools) {
      for (const id of Object.keys(tools)) {
        if (!isBoardTool(id)) delete tools[id];
      }
      return tools;
    },
    actions(_editor, actions) {
      // No asset store, so the insert menu items go
      delete actions['insert-media'];
      delete actions['insert-embed'];
      // A grouped card selects as its group, which hides the card's popup.
      // Ungroup stays for groups made before.
      delete actions['group'];
      // While the toast for a server write shows, Cmd+Z reverses that write
      const undo = actions['undo'];
      actions['undo'] = {
        ...undo,
        onSelect: (source) => {
          if (!controller?.undoToast.undo()) return undo.onSelect(source);
        },
      };
      // Connection arrows are deleted with their connection, after a
      // confirmation
      const tldrawDelete = actions['delete'];
      actions['delete'] = {
        ...tldrawDelete,
        onSelect: (source) => {
          if (!controller?.connectionEdits.requestDelete()) {
            return tldrawDelete.onSelect(source);
          }
        },
      };
      actions['toggle-card-arrows'] = {
        id: 'toggle-card-arrows',
        label: 'Hide or show arrows',
        onSelect: () => controller?.arrowView.toggleSelectedArrows(),
      };
      actions['quick-add'] = {
        id: 'quick-add',
        label: 'Quick add',
        kbd: '/',
        onSelect: () => controller?.quickAdd.open(),
      };
      return actions;
    },
  };
}
