'use client';

import { Modal } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import AddConnectionForm from '../addConnectionDrawer/AddConnectionForm';
import { Suspense } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl: string;
}

export default function AddConnectionModal(props: Props) {
  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title="New Connection"
      overlayProps={DEFAULT_OVERLAY_PROPS}
      size="md"
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Suspense>
        <AddConnectionForm
          onClose={props.onClose}
          sourceUrl={props.sourceUrl}
        />
      </Suspense>
    </Modal>
  );
}
