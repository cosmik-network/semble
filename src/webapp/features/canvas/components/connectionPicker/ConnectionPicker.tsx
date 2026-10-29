import {
  ActionIcon,
  Box,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useWindowEvent } from '@mantine/hooks';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { LuArrowUpDown } from 'react-icons/lu';
import {
  stopEventPropagation,
  useEditor,
  useValue,
  type TLArrowShape,
} from 'tldraw';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import type {
  ConnectionPicker as Picker,
  PickerState,
} from '../../controller/connections';
import useCanvasLink from '../../lib/queries/useCanvasLink';
import { arrowMiddle } from '../../shapes/connectionArrow/connectionArrows';
import classes from './ConnectionPicker.module.css';

const PICKER_MENU = 'canvas-connection-picker';
const WIDTH = 300;

interface Props {
  picker: Picker;
}

export default function ConnectionPicker(props: Props) {
  const open = useValue(props.picker.state);
  if (!open) return null;

  return <PickerPanel picker={props.picker} open={open} />;
}

interface PanelProps {
  picker: Picker;
  open: PickerState;
}

// Styled like the webapp's relation dropdown
function PickerPanel(props: PanelProps) {
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLButtonElement>(null);
  const position = useValue(
    'picker position',
    () => {
      const arrow = editor.getShape<TLArrowShape>(props.open.arrowId);
      const middle = arrow && arrowMiddle(editor, arrow);
      if (!arrow || !middle) return null;
      const inPage = editor.getShapePageTransform(arrow).applyToPoint(middle);
      return editor.pageToViewport(inPage);
    },
    [editor, props.open.arrowId],
  );

  // Open as a tldraw menu, so the board's shortcuts leave its keys alone
  useEffect(() => {
    editor.menus.addOpenMenu(PICKER_MENU);
    return () => editor.menus.deleteOpenMenu(PICKER_MENU);
  }, [editor]);

  // It renders once the arrow can be measured, which may not be at first
  const isPlaced = !!position;
  useEffect(() => {
    if (isPlaced) ref.current?.focus();
  }, [isPlaced]);

  // Escape still backs out once focus has left the picker
  useWindowEvent('keydown', (event) => {
    if (event.key === 'Escape') props.picker.discard();
  });

  useEffect(() => {
    highlightedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [props.open.highlighted]);

  function onKeyDown(event: KeyboardEvent) {
    const handlers: Record<string, () => void> = {
      ArrowDown: () => props.picker.moveHighlight(1),
      ArrowUp: () => props.picker.moveHighlight(-1),
      Enter: () => void props.picker.publish(),
      Escape: () => props.picker.discard(),
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    event.stopPropagation();
    handler();
  }

  if (!position) return null;

  return (
    <Paper
      ref={ref}
      tabIndex={-1}
      role="listbox"
      aria-label="Connection type"
      aria-activedescendant={`connection-type-${props.open.highlighted}`}
      withBorder
      shadow="md"
      radius="md"
      p={4}
      w={WIDTH}
      pos="absolute"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 12px)',
        zIndex: 'var(--layer-menus)',
        pointerEvents: 'all',
        outline: 'none',
      }}
      onPointerDown={stopEventPropagation}
      onKeyDown={onKeyDown}
    >
      <Group gap="sm" wrap="nowrap" px={8} pt={6} pb={10}>
        <div className={classes.route}>
          <EndTitle url={props.open.sourceUrl} />
          <EndTitle url={props.open.targetUrl} />
        </div>
        <Tooltip label="Swap" withArrow withinPortal={false}>
          <ActionIcon
            variant="light"
            color="blue"
            radius="xl"
            size="md"
            aria-label="Swap"
            onClick={() => {
              props.picker.swap();
              ref.current?.focus();
            }}
          >
            <LuArrowUpDown size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea.Autosize type="scroll" mah={300}>
        <Stack gap={0}>
          {CONNECTION_TYPES.map((type) => {
            const Icon = type.icon;
            const isHighlighted = type.value === props.open.highlighted;
            return (
              <UnstyledButton
                key={type.value}
                ref={isHighlighted ? highlightedRef : undefined}
                id={`connection-type-${type.value}`}
                role="option"
                aria-selected={isHighlighted}
                tabIndex={-1}
                p={5}
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                bg={
                  isHighlighted ? 'var(--mantine-color-green-light)' : undefined
                }
                onClick={() => void props.picker.publish(type.value)}
              >
                <Group gap="sm" wrap="nowrap">
                  <Icon size={20} color="green" />
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" c="bright" fw={isHighlighted ? 600 : 500}>
                      {type.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {type.description}
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  );
}

function EndTitle(props: { url: string }) {
  const { data: link } = useCanvasLink(props.url);

  return (
    <div className={classes.end}>
      <Text size="sm" fw={500} c="bright" truncate>
        {link?.metadata.title || props.url}
      </Text>
    </div>
  );
}
