'use client';

import { Modal } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import EditConnectionForm from '../editConnectionForm/EditConnectionForm';
import { ConnectionWithSourceAndTarget } from '@semble/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl: string;
  targetUrl?: string;
  connection?: ConnectionWithSourceAndTarget['connection'];
}

export default function EditConnectionModal(props: Props) {
  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title="Edit Connection"
      overlayProps={DEFAULT_OVERLAY_PROPS}
      size="md"
      centered
      onClick={(e) => e.stopPropagation()}
    >
      {props.connection && props.targetUrl && (
        <EditConnectionForm
          onClose={props.onClose}
          sourceUrl={props.sourceUrl}
          targetUrl={props.targetUrl}
          connection={props.connection}
        />
      )}
    </Modal>
  );
}
