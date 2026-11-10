import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Paper,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import { FiPlus } from 'react-icons/fi';
import {
  LuCaptions,
  LuCheck,
  LuEyeOff,
  LuScan,
  LuSpline,
  LuZoomIn,
  LuZoomOut,
} from 'react-icons/lu';
import { RiScreenshot2Line } from 'react-icons/ri';
import {
  exportAs,
  useEditor,
  useReadonly,
  useValue,
  type Editor,
} from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';

interface Props {
  // Null until the board has loaded
  arrowView: CanvasController['arrowView'] | null;
  quickAdd: CanvasController['quickAdd'] | null;
}

interface ButtonProps {
  label: string;
  disabled?: boolean;
  onClick(): void;
  children: ReactNode;
}

function NavButton(props: ButtonProps) {
  return (
    <Tooltip label={props.label} withArrow withinPortal={false}>
      <ActionIcon
        variant="subtle"
        color="gray"
        radius="xl"
        size="lg"
        aria-label={props.label}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.children}
      </ActionIcon>
    </Tooltip>
  );
}

function NavPill(props: { children: ReactNode }) {
  return (
    <Paper withBorder shadow="sm" radius="xl" p={4}>
      <Group gap={2} wrap="nowrap">
        {props.children}
      </Group>
    </Paper>
  );
}

interface ArrowMenuItemProps {
  label: string;
  icon: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onClick(): void;
}

// Stays open, so several can be toggled in one go
function ArrowMenuItem(props: ArrowMenuItemProps) {
  return (
    <Menu.Item
      role="menuitemcheckbox"
      aria-checked={props.checked}
      leftSection={props.icon}
      rightSection={props.checked ? <LuCheck size={14} /> : null}
      disabled={props.disabled}
      closeMenuOnClick={false}
      onClick={props.onClick}
    >
      {props.label}
    </Menu.Item>
  );
}

// The shapes in view, cropped to it, as a PNG download
async function screenshotView(editor: Editor) {
  const viewport = editor.getViewportPageBounds();
  const ids = editor
    .getCurrentPageShapes()
    .filter((shape) => editor.getShapePageBounds(shape)?.collides(viewport))
    .map((shape) => shape.id);
  if (ids.length === 0) return;
  try {
    await exportAs(editor, ids, {
      format: 'png',
      bounds: viewport,
      padding: 0,
      background: true,
    });
  } catch (error) {
    console.warn(error);
    notifications.show({
      id: 'canvas-screenshot-error',
      title: "Couldn't take a screenshot",
      message: 'Try again in a moment.',
      position: 'top-center',
    });
  }
}

export default function BoardNavigation(props: Props) {
  const editor = useEditor();
  const isReadonly = useReadonly();
  const hasShapes = useValue(
    'has shapes',
    () => editor.getCurrentPageShapeIds().size > 0,
    [editor],
  );
  const focusOn = useValue('arrow focus', () => props.arrowView?.isFocusOn(), [
    props.arrowView,
  ]);
  const hidden = useValue('arrows hidden', () => props.arrowView?.areHidden(), [
    props.arrowView,
  ]);
  const labelsOn = useValue(
    'arrow labels',
    () => props.arrowView?.areLabelsOn(),
    [props.arrowView],
  );

  return (
    <Group gap="xs" m="xs" wrap="nowrap" style={{ pointerEvents: 'all' }}>
      {!isReadonly && (
        <Tooltip
          label="Search or paste a link to add (/)"
          withArrow
          withinPortal={false}
        >
          {/* As tall as the pills beside it */}
          <Button
            radius="xl"
            h={44}
            leftSection={<FiPlus size={18} />}
            disabled={!props.quickAdd}
            onClick={() => props.quickAdd?.open()}
            style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
          >
            Add
          </Button>
        </Tooltip>
      )}
      <NavPill>
        <NavButton label="Zoom out" onClick={() => editor.zoomOut()}>
          <LuZoomOut size={16} />
        </NavButton>
        <NavButton label="Zoom to fit" onClick={() => editor.zoomToFit()}>
          <LuScan size={16} />
        </NavButton>
        <NavButton label="Zoom in" onClick={() => editor.zoomIn()}>
          <LuZoomIn size={16} />
        </NavButton>
      </NavPill>
      <NavPill>
        <Menu position="top-start" shadow="sm" withinPortal={false}>
          <Menu.Target>
            <Tooltip label="Arrows" withArrow withinPortal={false}>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                size="lg"
                aria-label="Arrows"
                disabled={!props.arrowView}
              >
                <LuSpline size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <ArrowMenuItem
              label="Focus arrows on hover"
              icon={<LuSpline size={16} />}
              checked={!!focusOn}
              disabled={!!hidden}
              onClick={() => props.arrowView?.toggleFocus()}
            />
            <ArrowMenuItem
              label="Show connection labels"
              icon={<LuCaptions size={16} />}
              checked={!!labelsOn}
              disabled={!!hidden}
              onClick={() => props.arrowView?.toggleLabels()}
            />
            <ArrowMenuItem
              label="Hide arrows"
              icon={<LuEyeOff size={16} />}
              checked={!!hidden}
              onClick={() => props.arrowView?.toggleHidden()}
            />
          </Menu.Dropdown>
        </Menu>
      </NavPill>
      <NavPill>
        <NavButton
          label="Screenshot the current view"
          disabled={!hasShapes}
          onClick={() => void screenshotView(editor)}
        >
          <RiScreenshot2Line size={16} />
        </NavButton>
      </NavPill>
    </Group>
  );
}
