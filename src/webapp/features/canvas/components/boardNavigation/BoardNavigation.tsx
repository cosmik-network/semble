import {
  ActionIcon,
  Box,
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
  LuEllipsis,
  LuEyeOff,
  LuEye,
  LuScan,
  LuSpline,
  LuZoomIn,
  LuZoomOut,
} from 'react-icons/lu';
import { RiScreenshot2Line } from 'react-icons/ri';
import {
  exportAs,
  tlenv,
  useActions,
  useEditor,
  useReadonly,
  useValue,
  type Editor,
} from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';
import { withProxiedExportImages } from '../../lib/proxiedExportImages';
import { withExportTitle } from '../../controller/boardExports';
import classes from './BoardNavigation.module.css';
import './focusMode.css';

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
    await withProxiedExportImages(() =>
      withExportTitle(editor, () =>
        exportAs(editor, ids, {
          format: 'png',
          bounds: viewport,
          padding: 0,
          background: true,
        }),
      ),
    );
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

const FOCUS_SHORTCUT = tlenv.isDarwin ? '⌘.' : 'Ctrl+.';

// tldraw's focus mode, which hides every panel but the button to come back
function useToggleUi() {
  const actions = useActions();
  return () => actions['toggle-focus-mode']?.onSelect('toolbar');
}

// Stands in for tldraw's own focus mode button, in the corner the controls
// were in
export function ShowUiButton() {
  const editor = useEditor();
  const toggleUi = useToggleUi();
  const isFocusMode = useValue(
    'focus mode',
    () => editor.getInstanceState().isFocusMode,
    [editor],
  );
  if (!isFocusMode) return null;

  return (
    <Box
      pos="absolute"
      left={0}
      bottom={0}
      m="xs"
      style={{ zIndex: 'var(--layer-panels)', pointerEvents: 'all' }}
    >
      <NavPill>
        <NavButton label={`Show UI (${FOCUS_SHORTCUT})`} onClick={toggleUi}>
          <LuEye size={16} />
        </NavButton>
      </NavPill>
    </Box>
  );
}

export default function BoardNavigation(props: Props) {
  const editor = useEditor();
  const toggleUi = useToggleUi();
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

  const arrowItems = (
    <>
      <ArrowMenuItem
        label="Focus arrows on hover"
        icon={<LuSpline size={16} />}
        checked={!!focusOn}
        disabled={!props.arrowView || !!hidden}
        onClick={() => props.arrowView?.toggleFocus()}
      />
      <ArrowMenuItem
        label="Show connection labels"
        icon={<LuCaptions size={16} />}
        checked={!!labelsOn}
        disabled={!props.arrowView || !!hidden}
        onClick={() => props.arrowView?.toggleLabels()}
      />
      <ArrowMenuItem
        label="Hide arrows"
        icon={<LuEyeOff size={16} />}
        checked={!!hidden}
        disabled={!props.arrowView}
        onClick={() => props.arrowView?.toggleHidden()}
      />
    </>
  );

  return (
    <Group
      className={classes.root}
      gap="xs"
      m="xs"
      wrap="nowrap"
      style={{ pointerEvents: 'all' }}
    >
      {!isReadonly && (
        <Tooltip
          label="Search or paste a link to add (/)"
          withArrow
          withinPortal={false}
        >
          {/* As tall as the pills beside it */}
          <Button
            visibleFrom="sm"
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
      {/* Kept small on phones, where it floats over the board */}
      {!isReadonly && (
        <ActionIcon
          hiddenFrom="sm"
          radius="xl"
          size={44}
          aria-label="Add"
          disabled={!props.quickAdd}
          onClick={() => props.quickAdd?.open()}
          style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
        >
          <FiPlus size={18} />
        </ActionIcon>
      )}
      <Group gap="xs" wrap="nowrap" visibleFrom="sm">
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
            <Menu.Dropdown>{arrowItems}</Menu.Dropdown>
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
          <NavButton label={`Hide UI (${FOCUS_SHORTCUT})`} onClick={toggleUi}>
            <LuEyeOff size={16} />
          </NavButton>
        </NavPill>
      </Group>
      <Box hiddenFrom="sm">
        <NavPill>
          <Menu position="top-start" shadow="sm" withinPortal={false}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                size="lg"
                aria-label="View options"
              >
                <LuEllipsis size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {/* Stay open, so zooming can be repeated */}
              <Menu.Item
                leftSection={<LuZoomOut size={16} />}
                closeMenuOnClick={false}
                onClick={() => editor.zoomOut()}
              >
                Zoom out
              </Menu.Item>
              <Menu.Item
                leftSection={<LuZoomIn size={16} />}
                closeMenuOnClick={false}
                onClick={() => editor.zoomIn()}
              >
                Zoom in
              </Menu.Item>
              <Menu.Item
                leftSection={<LuScan size={16} />}
                onClick={() => editor.zoomToFit()}
              >
                Zoom to fit
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Arrows</Menu.Label>
              {arrowItems}
              <Menu.Divider />
              <Menu.Item
                leftSection={<RiScreenshot2Line size={16} />}
                disabled={!hasShapes}
                onClick={() => void screenshotView(editor)}
              >
                Screenshot the view
              </Menu.Item>
              <Menu.Item
                leftSection={<LuEyeOff size={16} />}
                onClick={toggleUi}
              >
                Hide UI
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </NavPill>
      </Box>
    </Group>
  );
}
