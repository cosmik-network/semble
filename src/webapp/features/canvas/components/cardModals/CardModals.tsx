import { usePathname } from 'next/navigation';
import { CardSaveSource } from '@/features/analytics/types';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import { useUrlMetadataWithStats } from '@/features/cards/lib/queries/useUrlMetadata';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import useCanvasLink from '../../lib/queries/useCanvasLink';

export type CardModalKind = 'save' | 'connect';

export interface CardModal {
  // Null once closed; the link stays so the modal can animate out
  kind: CardModalKind | null;
  url: string;
}

interface Props {
  modal: CardModal | null;
  onClose(): void;
}

// The webapp's save and connect modals, once per canvas. Mounted closed with
// the board, since a modal that mounts open doesn't animate in.
export default function CardModals(props: Props) {
  const pathname = usePathname();
  const url = props.modal?.url ?? '';
  const isOpen = !!props.modal?.kind;
  const { data: link } = useCanvasLink(url, isOpen);
  // Only for the save count, which the board doesn't keep
  const { data: metadata } = useUrlMetadataWithStats({ url, enabled: isOpen });
  const analyticsContext = {
    saveSource: CardSaveSource.CANVAS,
    pagePath: pathname,
  };

  return (
    <>
      <AddCardToModal
        isOpen={props.modal?.kind === 'save'}
        onClose={props.onClose}
        url={url}
        cardContent={link?.metadata}
        isInYourLibrary={link?.saved}
        urlLibraryCount={metadata?.stats?.libraryCount ?? 0}
        analyticsContext={analyticsContext}
      />
      <AddConnectionModal
        isOpen={props.modal?.kind === 'connect'}
        onClose={props.onClose}
        sourceUrl={url}
        analyticsContext={analyticsContext}
      />
    </>
  );
}
