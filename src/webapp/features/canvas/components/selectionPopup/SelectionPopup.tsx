import { ActionIcon, Tooltip } from '@mantine/core';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { MdOpenInNew } from 'react-icons/md';
import { TbPlugConnected } from 'react-icons/tb';
import { useEditor, useValue, type Computed } from 'tldraw';
import { getSembleHref } from '@/lib/utils/link';
import type { PopupCard } from '../../controller/popupCard';
import {
  useMediaRevealed,
  useMediaReveals,
} from '../../lib/canvasMediaRevealsContext';
import useCanvasLink from '../../lib/queries/useCanvasLink';
import { linkCardPreview } from '../../model/linkCards';
import BoardPopup, {
  GAP,
  ICON_PROPS,
  ROOM_ABOVE,
} from '../boardPopup/BoardPopup';
import type { CardModalKind } from '../cardModals/CardModals';
import { EDGE_DOT_REACH } from '../edgeDots/EdgeDots';

interface Props {
  popupCard: Computed<PopupCard | null>;
  onOpen(kind: CardModalKind, url: string): void;
}

export default function SelectionPopup(props: Props) {
  const card = useValue(props.popupCard);
  if (!card) return null;

  return <Popup card={card} onOpen={props.onOpen} />;
}

interface PopupProps {
  card: PopupCard;
  onOpen: Props['onOpen'];
}

function Popup(props: PopupProps) {
  const editor = useEditor();
  const { data: link } = useCanvasLink(props.card.url);
  const mediaReveals = useMediaReveals();
  const mediaRevealed = useMediaRevealed(props.card.id);
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

  const open = (kind: CardModalKind) => () =>
    props.onOpen(kind, props.card.url);
  const saveLabel = link?.saved ? 'Update' : 'Save';
  const preview = linkCardPreview(link);
  const hidesMedia = preview.kind === 'post' && !!preview.mediaHiddenBecause;
  const mediaLabel = mediaRevealed ? 'Hide media' : 'Show media';

  return (
    <BoardPopup position={position}>
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
      {hidesMedia && mediaReveals && (
        <Tooltip label={mediaLabel} withArrow withinPortal={false}>
          <ActionIcon
            {...ICON_PROPS}
            aria-label={mediaLabel}
            onClick={() => mediaReveals.toggle(props.card.id)}
          >
            {mediaRevealed ? <LuEyeOff size={16} /> : <LuEye size={16} />}
          </ActionIcon>
        </Tooltip>
      )}
      <Tooltip label="Open page" withArrow withinPortal={false}>
        <ActionIcon
          {...ICON_PROPS}
          component={Link}
          href={getSembleHref(props.card.url)}
          aria-label="Open page"
        >
          <MdOpenInNew size={16} />
        </ActionIcon>
      </Tooltip>
    </BoardPopup>
  );
}
