import { useEditor } from 'tldraw';
import { useCanvasSession } from '../lib/canvasSession';
import { useArrowConnectionSync } from './useArrowConnectionSync';
import { useCanvasInteractions } from './useCanvasInteractions';
import { useCardCopySync } from './useCardCopySync';
import { useConnectionReconcile } from './useConnectionReconcile';
import { useExternalUrlContent } from './useExternalUrlContent';
import { useFrameCollectionSync } from './useFrameCollectionSync';
import { useLibrarySync } from './useLibrarySync';
import { useStaleArrowCleanup } from './useStaleArrowCleanup';

export default function CanvasSync() {
  const editor = useEditor();
  const session = useCanvasSession();

  useStaleArrowCleanup(editor);
  useExternalUrlContent(editor, session);
  useCardCopySync(editor);
  useArrowConnectionSync(editor, session);
  useConnectionReconcile(editor, session);
  useFrameCollectionSync(editor, session);
  useLibrarySync(editor, session);
  useCanvasInteractions(editor, session);

  return null;
}
