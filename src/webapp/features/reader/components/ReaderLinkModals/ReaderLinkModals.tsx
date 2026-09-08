'use client';

import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import { useUrlMetadataWithStats } from '@/features/cards/lib/queries/useUrlMetadata';
import { CardSaveSource } from '@/features/analytics/types';
import { useAuth } from '@/hooks/useAuth';
import {
  useReaderLinkDispatch,
  useReaderLinkState,
  type ReaderLinkModal,
} from '../../lib/readerLinkState';
import type { ReaderLink } from '../../lib/utils/readerLink';

interface Props {
  articleUrl: string;
}

// Above the reader drawer
const Z_INDEX = 300;

interface ContentProps extends Props {
  link: ReaderLink;
  modal: ReaderLinkModal | null;
  onClose: () => void;
}

function Content(props: ContentProps) {
  const status = useUrlMetadataWithStats({ url: props.link.href });

  return (
    <>
      <AddCardToModal
        isOpen={props.modal === 'add'}
        onClose={props.onClose}
        url={props.link.href}
        cardContent={status.data?.metadata}
        isInYourLibrary={status.data?.urlInLibrary}
        urlLibraryCount={status.data?.stats?.libraryCount ?? 0}
        analyticsContext={{ saveSource: CardSaveSource.READER }}
        zIndex={Z_INDEX}
      />
      <AddConnectionModal
        isOpen={props.modal === 'connect'}
        onClose={props.onClose}
        sourceUrl={props.link.href}
        targetUrl={props.articleUrl}
        analyticsContext={{ saveSource: CardSaveSource.READER }}
        zIndex={Z_INDEX}
      />
    </>
  );
}

export default function ReaderLinkModals(props: Props) {
  const { isAuthenticated } = useAuth();
  const { preparedLink, modal } = useReaderLinkState();
  const dispatch = useReaderLinkDispatch();

  if (!isAuthenticated || !preparedLink) return null;

  return (
    <Content
      link={preparedLink}
      modal={modal}
      articleUrl={props.articleUrl}
      onClose={() => dispatch({ type: 'closeModal' })}
    />
  );
}
