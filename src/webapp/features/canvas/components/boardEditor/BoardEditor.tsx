'use client';

import 'tldraw/tldraw.css';
import { useComputedColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  Editor,
  Tldraw,
  type TLComponents,
  type TLUiOverrides,
} from 'tldraw';
import { attachCanvasController } from '../../controller/canvasController';
import { isBoardTool } from '../../model/boardTools';
import type { CanvasServer } from '../../server/canvasServer';
import { MemoryCanvasStorage } from '../../storage/memoryCanvasStorage';
import BoardHeader from '../boardHeader/BoardHeader';
import BoardToolbar from '../boardToolbar/BoardToolbar';

// tldraw's licence requires the "Made with tldraw" watermark to stay visible
// and unaltered: never hide, cover or restyle it. See TLDRAW-LICENSE.md.

const DEFAULT_TITLE = 'Untitled canvas';

// The header replaces the main and page menus: a board has one page
const components: TLComponents = {
  MenuPanel: () => <BoardHeader title={DEFAULT_TITLE} />,
  Toolbar: BoardToolbar,
};

// Removing tools here also removes their keyboard shortcuts
const overrides: TLUiOverrides = {
  tools(_editor, tools) {
    for (const id of Object.keys(tools)) {
      if (!isBoardTool(id)) delete tools[id];
    }
    return tools;
  },
  // No asset store, so the insert menu items go
  actions(_editor, actions) {
    delete actions['insert-media'];
    delete actions['insert-embed'];
    return actions;
  },
};

const server: CanvasServer = {};

interface Props {
  canvasId: string;
}

export default function BoardEditor(props: Props) {
  const colorScheme = useComputedColorScheme();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [storage] = useState(() => new MemoryCanvasStorage());

  useEffect(() => {
    if (!editor) return;
    return attachCanvasController({
      editor,
      server,
      storage,
      canvasId: props.canvasId,
    });
  }, [editor, storage, props.canvasId]);

  useEffect(() => {
    editor?.user.updateUserPreferences({ colorScheme });
  }, [editor, colorScheme]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw
        components={components}
        overrides={overrides}
        onMount={setEditor}
      />
    </div>
  );
}
