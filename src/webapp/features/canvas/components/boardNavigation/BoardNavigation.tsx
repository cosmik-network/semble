import { ActionIcon, Divider, Group, Paper, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { LuEyeOff, LuFocus, LuMinus, LuPlus, LuScan } from 'react-icons/lu';
import { useEditor, useValue } from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';

interface Props {
  // Null until the board has loaded
  arrowView: CanvasController['arrowView'] | null;
}

interface ButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick(): void;
  children: ReactNode;
}

function NavButton(props: ButtonProps) {
  return (
    <Tooltip label={props.label} withArrow withinPortal={false}>
      <ActionIcon
        variant={props.active ? 'light' : 'subtle'}
        color={props.active ? undefined : 'gray'}
        radius="xl"
        size="lg"
        aria-label={props.label}
        aria-pressed={props.active}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.children}
      </ActionIcon>
    </Tooltip>
  );
}

export default function BoardNavigation(props: Props) {
  const editor = useEditor();
  const focusOn = useValue('arrow focus', () => props.arrowView?.isFocusOn(), [
    props.arrowView,
  ]);
  const hidden = useValue('arrows hidden', () => props.arrowView?.areHidden(), [
    props.arrowView,
  ]);

  return (
    <Paper
      withBorder
      shadow="sm"
      radius="xl"
      p={4}
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Group gap={2} wrap="nowrap">
        <NavButton label="Zoom out" onClick={() => editor.zoomOut()}>
          <LuMinus size={16} />
        </NavButton>
        <NavButton label="Zoom in" onClick={() => editor.zoomIn()}>
          <LuPlus size={16} />
        </NavButton>
        <NavButton label="Zoom to fit" onClick={() => editor.zoomToFit()}>
          <LuScan size={16} />
        </NavButton>
        <Divider orientation="vertical" mx={4} />
        <NavButton
          label={focusOn ? 'Show every arrow' : 'Focus arrows on hover'}
          active={!!focusOn}
          disabled={!props.arrowView || !!hidden}
          onClick={() => props.arrowView?.toggleFocus()}
        >
          <LuFocus size={16} />
        </NavButton>
        <NavButton
          label={hidden ? 'Show arrows' : 'Hide arrows'}
          active={!!hidden}
          disabled={!props.arrowView}
          onClick={() => props.arrowView?.toggleHidden()}
        >
          <LuEyeOff size={16} />
        </NavButton>
      </Group>
    </Paper>
  );
}
