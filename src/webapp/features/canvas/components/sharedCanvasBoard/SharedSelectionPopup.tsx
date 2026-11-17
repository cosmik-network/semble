import { useValue, type Computed } from 'tldraw';
import { getSembleHref } from '@/lib/utils/link';
import type { PopupCard } from '../../controller/popupCard';
import useCanvasLink from '../../lib/queries/useCanvasLink';
import BoardPopup from '../boardPopup/BoardPopup';
import {
  MediaButton,
  OpenPageButton,
  usePopupPosition,
} from '../selectionPopup/SelectionPopup';

// The view-only selection popup: nothing that writes
export default function SharedSelectionPopup(props: {
  popupCard: Computed<PopupCard | null>;
}) {
  const card = useValue(props.popupCard);
  if (!card) return null;
  if (card.kind === 'collection') return <CollectionPopup card={card} />;
  return <LinkPopup card={card} />;
}

function CollectionPopup(props: { card: PopupCard }) {
  const position = usePopupPosition(0);
  if (!position) return null;

  return (
    <BoardPopup position={position}>
      <OpenPageButton href={new URL(props.card.url).pathname} />
    </BoardPopup>
  );
}

function LinkPopup(props: { card: PopupCard }) {
  const { data: link } = useCanvasLink(props.card.url);
  const position = usePopupPosition(0);
  if (!position) return null;

  return (
    <BoardPopup position={position}>
      <MediaButton cardId={props.card.id} link={link} />
      <OpenPageButton href={getSembleHref(props.card.url)} />
    </BoardPopup>
  );
}
