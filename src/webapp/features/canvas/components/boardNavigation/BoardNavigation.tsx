import { ActionIcon, Button, Group, Paper, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiPlus } from 'react-icons/fi';
import { LuEyeOff, LuMinus, LuPlus, LuScan, LuSpline } from 'react-icons/lu';
import { useEditor, useReadonly, useValue } from 'tldraw';
import type { CanvasController } from '../../controller/canvasController';

interface Props {
  // Null until the board has loaded
  arrowView: CanvasController['arrowView'] | null;
  quickAdd: CanvasController['quickAdd'] | null;
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

function NavPill(props: { children: ReactNode }) {
  return (
    <Paper withBorder shadow="sm" radius="xl" p={4}>
      <Group gap={2} wrap="nowrap">
        {props.children}
      </Group>
    </Paper>
  );
}

export default function BoardNavigation(props: Props) {
  const editor = useEditor();
  const isReadonly = useReadonly();
  const focusOn = useValue('arrow focus', () => props.arrowView?.isFocusOn(), [
    props.arrowView,
  ]);
  const hidden = useValue('arrows hidden', () => props.arrowView?.areHidden(), [
    props.arrowView,
  ]);

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
          <LuMinus size={16} />
        </NavButton>
        <NavButton label="Zoom to fit" onClick={() => editor.zoomToFit()}>
          <LuScan size={16} />
        </NavButton>
        <NavButton label="Zoom in" onClick={() => editor.zoomIn()}>
          <LuPlus size={16} />
        </NavButton>
      </NavPill>
      <NavPill>
        <NavButton
          label={focusOn ? 'Show every arrow' : 'Focus arrows on hover'}
          active={!!focusOn}
          disabled={!props.arrowView || !!hidden}
          onClick={() => props.arrowView?.toggleFocus()}
        >
          <LuSpline size={16} />
        </NavButton>
        <NavButton
          label={hidden ? 'Show arrows' : 'Hide arrows'}
          active={!!hidden}
          disabled={!props.arrowView}
          onClick={() => props.arrowView?.toggleHidden()}
        >
          <LuEyeOff size={16} />
        </NavButton>
      </NavPill>
    </Group>
  );
}
