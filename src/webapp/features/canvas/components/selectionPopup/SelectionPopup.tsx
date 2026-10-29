import { ActionIcon, Group, Paper, Tooltip } from '@mantine/core';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { MdOpenInNew } from 'react-icons/md';
import { TbPlugConnected } from 'react-icons/tb';
import {
  stopEventPropagation,
  useEditor,
  useValue,
  type Computed,
} from 'tldraw';
import { getSembleHref } from '@/lib/utils/link';
import useCanvasLink from '../../lib/queries/useCanvasLink';
import type { CardModalKind } from '../cardModals/CardModals';
import { EDGE_DOT_REACH } from '../edgeDots/EdgeDots';

const GAP = 8;
// Less room than this above the card puts the popup below it
const ROOM_ABOVE = 80;

const ICON_PROPS = {
  variant: 'light',
  color: 'gray',
  size: 'md',
  radius: 'xl',
} as const;

interface Props {
  popupLink: Computed<string | null>;
  onOpen(kind: CardModalKind, url: string): void;
}

export default function SelectionPopup(props: Props) {
  const url = useValue(props.popupLink);
  if (!url) return null;

  return <Popup url={url} onOpen={props.onOpen} />;
}

interface PopupProps {
  url: string;
  onOpen: Props['onOpen'];
}

function Popup(props: PopupProps) {
  const editor = useEditor();
  const { data: link } = useCanvasLink(props.url);
  const position = useValue(
    'popup position',
    () => {
      const bounds = editor.getSelectionPageBounds();
      if (!bounds) return null;
      const top = editor.pageToViewport(bounds.point);
      const bottom = editor.pageToViewport({ x: bounds.maxX, y: bounds.maxY });
      const above = top.y > ROOM_ABOVE;
      // Clear of the card's edge dots
      const gap = GAP + EDGE_DOT_REACH * editor.getZoomLevel();
      return {
        left: (top.x + bottom.x) / 2,
        top: above ? top.y - gap : bottom.y + gap,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      };
    },
    [editor],
  );
  if (!position) return null;

  const open = (kind: CardModalKind) => () => props.onOpen(kind, props.url);
  const saveLabel = link?.saved ? 'Update' : 'Save';

  return (
    <Paper
      withBorder
      shadow="sm"
      radius="xl"
      p={6}
      pos="absolute"
      style={{
        ...position,
        zIndex: 'var(--layer-menus)',
        pointerEvents: 'all',
      }}
      onPointerDown={stopEventPropagation}
    >
      <Group gap={6} wrap="nowrap">
        <Tooltip label={saveLabel} withArrow withinPortal={false}>
          <ActionIcon
            {...ICON_PROPS}
            aria-label={saveLabel}
            onClick={open('save')}
          >
            {link?.saved ? <IoMdCheckmark size={16} /> : <FiPlus size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Connect" withArrow withinPortal={false}>
          <ActionIcon
            {...ICON_PROPS}
            aria-label="Connect"
            onClick={open('connect')}
          >
            <TbPlugConnected size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Open page" withArrow withinPortal={false}>
          <ActionIcon
            {...ICON_PROPS}
            component={Link}
            href={getSembleHref(props.url)}
            aria-label="Open page"
          >
            <MdOpenInNew size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}
