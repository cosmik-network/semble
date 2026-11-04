import { computed, isUninitialized, type Computed, type Editor } from 'tldraw';
import { nextDetailLevel, type DetailLevel } from '../model/detailLevel';

const levelOf = new WeakMap<Editor, Computed<DetailLevel>>();

// Changes only once the camera stops, so nothing redraws mid-gesture
export function detailLevel(editor: Editor): DetailLevel {
  let level = levelOf.get(editor);
  if (!level) {
    level = computed<DetailLevel>('detail level', (previous) => {
      const last = isUninitialized(previous) ? 'full' : previous;
      if (editor.getCameraState() === 'moving') return last;
      return nextDetailLevel(last, editor.getZoomLevel());
    });
    levelOf.set(editor, level);
  }
  return level.get();
}
