'use client';

import { Modal } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import AddConnectionForm from '../addConnectionDrawer/AddConnectionForm';
import { ConnectionForUrl } from '@semble/types';
import { Suspense } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl: string;
  connectionToEdit?: {
    connection: ConnectionForUrl['connection'];
    targetUrl: string;
  };
}

export default function AddConnectionModal(props: Props) {
  const isEditMode = !!props.connectionToEdit;

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title={isEditMode ? 'Edit Connection' : 'New Connection'}
      overlayProps={DEFAULT_OVERLAY_PROPS}
      size="md"
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Suspense>
        <AddConnectionForm
          onClose={props.onClose}
          sourceUrl={props.sourceUrl}
          connectionToEdit={props.connectionToEdit}
        />
      </Suspense>
    </Modal>
  );
}
