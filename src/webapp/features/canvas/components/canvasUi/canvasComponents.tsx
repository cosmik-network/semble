import {
  ArrowToolbarItem,
  DefaultToolbar,
  FrameToolbarItem,
  HandToolbarItem,
  NoteToolbarItem,
  SelectToolbarItem,
  TextToolbarItem,
  TLComponents,
} from 'tldraw';
import CanvasOverlays from '../canvasOverlays/CanvasOverlays';
import CanvasContextMenu from './CanvasContextMenu';
import CanvasNavigation from './CanvasNavigation';

function CanvasToolbar() {
  return (
    <DefaultToolbar>
      <SelectToolbarItem />
      <HandToolbarItem />
      <ArrowToolbarItem />
      <NoteToolbarItem />
      <TextToolbarItem />
      <FrameToolbarItem />
    </DefaultToolbar>
  );
}

export const canvasComponents: TLComponents = {
  Toolbar: CanvasToolbar,
  ContextMenu: CanvasContextMenu,
  InFrontOfTheCanvas: CanvasOverlays,
  NavigationPanel: CanvasNavigation,
  MenuPanel: null,
  HelpMenu: null,
  DebugPanel: null,
  DebugMenu: null,
  SharePanel: null,
};
