import { ActionIcon, Button, Divider, Tooltip } from '@mantine/core';
import {
  DefaultMinimap,
  stopEventPropagation,
  useEditor,
  useValue,
} from 'tldraw';
import {
  LuMap,
  LuMaximize,
  LuMinus,
  LuPlus,
  LuRedo2,
  LuUndo2,
  LuWaypoints,
} from 'react-icons/lu';
import { zoomToFitAll } from '../../lib/applyLayout';
import { useCanvasSession } from '../../lib/canvasSession';
import styles from './CanvasNavigation.module.css';

const ANIMATION = { animation: { duration: 200 } };

export default function CanvasNavigation() {
  const editor = useEditor();
  const session = useCanvasSession();
  const minimapOpen = useValue(session.minimapOpen);
  const connectionsHidden = useValue(session.connectionsHidden);
  const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor]);
  const canUndo = useValue('can undo', () => editor.getCanUndo(), [editor]);
  const canRedo = useValue('can redo', () => editor.getCanRedo(), [editor]);

  const buttons = [
    {
      label: 'Undo',
      icon: <LuUndo2 />,
      disabled: !canUndo,
      onClick: () => editor.undo(),
    },
    {
      label: 'Redo',
      icon: <LuRedo2 />,
      disabled: !canRedo,
      onClick: () => editor.redo(),
    },
  ];

  return (
    <div className={styles.root} onPointerDown={stopEventPropagation}>
      {minimapOpen && (
        <div className={styles.minimap}>
          <DefaultMinimap />
        </div>
      )}
      <div className={styles.pill}>
        {buttons.map((b) => (
          <Tooltip key={b.label} label={b.label} withinPortal={false}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              aria-label={b.label}
              disabled={b.disabled}
              onClick={b.onClick}
            >
              {b.icon}
            </ActionIcon>
          </Tooltip>
        ))}
        <Divider orientation="vertical" mx={4} my={6} />
        <Tooltip label="Zoom out" withinPortal={false}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Zoom out"
            onClick={() => editor.zoomOut(undefined, ANIMATION)}
          >
            <LuMinus />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Reset zoom" withinPortal={false}>
          <Button
            className={styles.zoom}
            variant="subtle"
            color="gray"
            size="compact-sm"
            px={6}
            onClick={() => editor.resetZoom(undefined, ANIMATION)}
          >
            {Math.round(zoom * 100)}%
          </Button>
        </Tooltip>
        <Tooltip label="Zoom in" withinPortal={false}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Zoom in"
            onClick={() => editor.zoomIn(undefined, ANIMATION)}
          >
            <LuPlus />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Zoom to fit" withinPortal={false}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Zoom to fit"
            onClick={() => zoomToFitAll(editor)}
          >
            <LuMaximize />
          </ActionIcon>
        </Tooltip>
        <Divider orientation="vertical" mx={4} my={6} />
        <Tooltip
          label={minimapOpen ? 'Hide minimap' : 'Show minimap'}
          withinPortal={false}
        >
          <ActionIcon
            variant={minimapOpen ? 'light' : 'subtle'}
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Toggle minimap"
            onClick={() => session.minimapOpen.set(!minimapOpen)}
          >
            <LuMap />
          </ActionIcon>
        </Tooltip>
        <Tooltip
          label={connectionsHidden ? 'Show connections' : 'Hide connections'}
          withinPortal={false}
        >
          <ActionIcon
            variant={connectionsHidden ? 'light' : 'subtle'}
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Toggle connections"
            onClick={() => session.connectionsHidden.set(!connectionsHidden)}
          >
            <LuWaypoints />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}
