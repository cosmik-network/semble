'use client';

import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import { useQuery } from '@tanstack/react-query';
import { getCardFromMyLibrary } from '@/features/cards/lib/dal';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { useUrlMetadataWithStats } from '@/features/cards/lib/queries/useUrlMetadata';
import { Button, Group } from '@mantine/core';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import { track } from '@vercel/analytics';
import { CardSaveSource } from '@/features/analytics/types';
import { usePathname } from 'next/navigation';
import { TbPlugConnected } from 'react-icons/tb';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';

interface Props {
  url: string;
  viaCardId?: string;
}

export default function SembleActions(props: Props) {
  const pathname = usePathname();
  // The buttons only need urlInLibrary, which the (fast) metadata query
  // already carries — the metadata call shares its cache entry with the rest
  // of the page. The full my-library status (card content, note, collections)
  // is only needed once the modal opens, so it loads in the background
  // instead of blocking the buttons behind the slower endpoint.
  const metadata = useUrlMetadataWithStats({ url: props.url });
  const cardStatus = useQuery({
    queryKey: cardKeys.byUrl(props.url),
    queryFn: () => getCardFromMyLibrary(props.url),
  });
  const isInYourLibrary =
    metadata.data?.urlInLibrary ?? cardStatus.data?.card?.urlInLibrary;
  const [showAddToModal, setShowAddToModal] = useState(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);

  const { data } = useSembleLibraries({ url: props.url });
  const allLibraries =
    data?.pages.flatMap((page) => page.libraries ?? []) ?? [];

  const urlLibraryCount = allLibraries.length ?? 0;

  return (
    <Fragment>
      <Group gap={'xs'}>
        <Button
          variant="light"
          color="green"
          radius={'xl'}
          leftSection={<TbPlugConnected size={18} />}
          onClick={(e) => {
            e.stopPropagation();
            setShowAddConnectionModal(true);
          }}
        >
          Connect
        </Button>
        <Button
          variant={isInYourLibrary ? 'light' : 'filled'}
          leftSection={
            isInYourLibrary ? <IoMdCheckmark size={18} /> : <FiPlus size={18} />
          }
          onClick={() => {
            setShowAddToModal(true);
            track(
              `Semble: ${isInYourLibrary ? 'update card' : 'add to library'}`,
            );
          }}
        >
          {isInYourLibrary ? 'Update' : 'Add'}
        </Button>
      </Group>

      <AddConnectionModal
        isOpen={showAddConnectionModal}
        onClose={() => setShowAddConnectionModal(false)}
        sourceUrl={props.url}
      />

      <AddCardToModal
        isOpen={showAddToModal}
        onClose={() => setShowAddToModal(false)}
        url={props.url}
        cardContent={cardStatus.data?.card?.cardContent}
        isInYourLibrary={isInYourLibrary}
        urlLibraryCount={urlLibraryCount}
        viaCardId={props.viaCardId}
        analyticsContext={{
          saveSource: CardSaveSource.SEMBLE_PAGE,
          pagePath: pathname,
        }}
      />
    </Fragment>
  );
}
