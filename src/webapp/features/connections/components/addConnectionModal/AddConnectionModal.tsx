'use client';

import { Modal } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import AddConnectionForm from '../addConnectionDrawer/AddConnectionForm';
import { Suspense } from 'react';
import {
  CardSaveAnalyticsContext,
  ConnectionCreateSource,
} from '@/features/analytics/types';
import type { ConnectionType } from '@semble/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  createSource: ConnectionCreateSource;
  sourceUrl?: string;
  sourceInLibrary?: boolean;
  targetUrl?: string;
  defaultConnectionType?: ConnectionType;
  analyticsContext?: CardSaveAnalyticsContext;
  zIndex?: number;
  /** Fires once the connection has been created */
  onCreated?: () => void;
}

export default function AddConnectionModal(props: Props) {
  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title="New Connection"
      zIndex={props.zIndex}
      overlayProps={
        props.zIndex
          ? { ...DEFAULT_OVERLAY_PROPS, zIndex: props.zIndex - 1 }
          : DEFAULT_OVERLAY_PROPS
      }
      size="md"
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Suspense>
        <AddConnectionForm
          onClose={props.onClose}
          createSource={props.createSource}
          sourceUrl={props.sourceUrl}
          sourceInLibrary={props.sourceInLibrary}
          targetUrl={props.targetUrl}
          defaultConnectionType={props.defaultConnectionType}
          analyticsContext={props.analyticsContext}
          onCreated={props.onCreated}
        />
      </Suspense>
    </Modal>
  );
}
