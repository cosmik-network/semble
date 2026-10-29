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
