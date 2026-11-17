import { ActionIcon, Tooltip } from '@mantine/core';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { MdOpenInNew } from 'react-icons/md';
import { TbPlugConnected, TbTopologyStar3 } from 'react-icons/tb';
import { useState } from 'react';
import { useEditor, useValue, type Computed, type TLShapeId } from 'tldraw';
import { getSembleHref } from '@/lib/utils/link';
import type { LinkSeed } from '../../controller/linkSeed';
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
  linkSeed: LinkSeed;
  onOpen(kind: CardModalKind, url: string): void;
}

export default function SelectionPopup(props: Props) {
  const card = useValue(props.popupCard);
  if (!card) return null;
  if (card.kind === 'collection') {
    return <CollectionPopup card={card} onOpen={props.onOpen} />;
  }
  return (
    <LinkPopup card={card} linkSeed={props.linkSeed} onOpen={props.onOpen} />
  );
}

// Above the selection where there's room, else below it, clear by reach
export function usePopupPosition(reach: number) {
  const editor = useEditor();
  return useValue(
    'popup position',
    () => {
      const bounds = editor.getSelectionPageBounds();
      if (!bounds) return null;
      const top = editor.pageToViewport(bounds.point);
      const bottom = editor.pageToViewport({ x: bounds.maxX, y: bounds.maxY });
      const above = top.y > ROOM_ABOVE;
      const gap = GAP + reach * editor.getZoomLevel();
      return {
        left: (top.x + bottom.x) / 2,
        top: above ? top.y - gap : bottom.y + gap,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      };
    },
    [editor, reach],
  );
}

interface CollectionPopupProps {
  card: PopupCard;
  onOpen: Props['onOpen'];
}

function CollectionPopup(props: CollectionPopupProps) {
  const { data: link } = useCanvasLink(props.card.url);
  const position = usePopupPosition(0);
  if (!position) return null;

  return (
    <BoardPopup position={position}>
      <SaveButton
        saved={!!link?.saved}
        onClick={() => props.onOpen('save', props.card.url)}
      />
      <ConnectButton onClick={() => props.onOpen('connect', props.card.url)} />
      <OpenPageButton href={new URL(props.card.url).pathname} />
    </BoardPopup>
  );
}

function SaveButton(props: { saved: boolean; onClick(): void }) {
  const label = props.saved ? 'Update' : 'Save';
  return (
    <Tooltip label={label} withArrow withinPortal={false}>
      <ActionIcon {...ICON_PROPS} aria-label={label} onClick={props.onClick}>
        {props.saved ? <IoMdCheckmark size={16} /> : <FiPlus size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}

function ConnectButton(props: { onClick(): void }) {
  return (
    <Tooltip label="Connect" withArrow withinPortal={false}>
      <ActionIcon {...ICON_PROPS} aria-label="Connect" onClick={props.onClick}>
        <TbPlugConnected size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

export function OpenPageButton(props: { href: string }) {
  return (
    <Tooltip label="Open page" withArrow withinPortal={false}>
      <ActionIcon
        {...ICON_PROPS}
        component={Link}
        href={props.href}
        aria-label="Open page"
      >
        <MdOpenInNew size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

// Shown only for a post whose labelled media is hidden
export function MediaButton(props: {
  cardId: TLShapeId;
  link: ReturnType<typeof useCanvasLink>['data'];
}) {
  const mediaReveals = useMediaReveals();
  const mediaRevealed = useMediaRevealed(props.cardId);
  const preview = linkCardPreview(props.link);
  const hidesMedia = preview.kind === 'post' && !!preview.mediaHiddenBecause;
  if (!hidesMedia || !mediaReveals) return null;
  const label = mediaRevealed ? 'Hide media' : 'Show media';

  return (
    <Tooltip label={label} withArrow withinPortal={false}>
      <ActionIcon
        {...ICON_PROPS}
        aria-label={label}
        onClick={() => mediaReveals.toggle(props.cardId)}
      >
        {mediaRevealed ? <LuEyeOff size={16} /> : <LuEye size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}

interface PopupProps {
  card: PopupCard;
  linkSeed: LinkSeed;
  onOpen: Props['onOpen'];
}

function LinkPopup(props: PopupProps) {
  const { data: link } = useCanvasLink(props.card.url);
  // Clear of the card's edge dots
  const position = usePopupPosition(EDGE_DOT_REACH);
  const unplaced = useValue(
    'unplaced links',
    () => props.linkSeed.unplaced(props.card.id).length,
    // Counted again when the link's connections refresh
    [props.linkSeed, props.card.id, link],
  );
  const hasRings = useValue(
    'has rings',
    () => props.linkSeed.ringsOf(props.card.id) !== null,
    [props.linkSeed, props.card.id],
  );
  const [placingMore, setPlacingMore] = useState(false);
  if (!position) return null;

  const placeMore = async () => {
    setPlacingMore(true);
    try {
      await props.linkSeed.placeMore(props.card.id);
    } finally {
      setPlacingMore(false);
    }
  };
  const placeMoreLabel = hasRings
    ? `Place more connected links (${unplaced} left)`
    : `Place connected links (${unplaced})`;

  const open = (kind: CardModalKind) => () =>
    props.onOpen(kind, props.card.url);

  return (
    <BoardPopup position={position}>
      <SaveButton saved={!!link?.saved} onClick={open('save')} />
      <ConnectButton onClick={open('connect')} />
      <MediaButton cardId={props.card.id} link={link} />
      {unplaced > 0 && (
        <Tooltip label={placeMoreLabel} withArrow withinPortal={false}>
          <ActionIcon
            {...ICON_PROPS}
            aria-label={placeMoreLabel}
            loading={placingMore}
            onClick={placeMore}
          >
            <TbTopologyStar3 size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      <OpenPageButton href={getSembleHref(props.card.url)} />
    </BoardPopup>
  );
}
