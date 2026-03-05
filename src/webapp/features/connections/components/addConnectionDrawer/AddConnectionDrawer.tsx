'use client';

import { Container, Drawer } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import AddConnectionForm from './AddConnectionForm';
import { ConnectionForUrl } from '@semble/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl: string;
  connectionToEdit?: {
    connection: ConnectionForUrl['connection'];
    targetUrl: string;
  };
}

export default function AddConnectionDrawer(props: Props) {
  const isEditMode = !!props.connectionToEdit;

  return (
    <Drawer
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      size={'30.5rem'}
      padding={'sm'}
      position="bottom"
      overlayProps={DEFAULT_OVERLAY_PROPS}
    >
      <Drawer.Header>
        <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
          {isEditMode ? 'Edit Connection' : 'New Connection'}
        </Drawer.Title>
      </Drawer.Header>
      <Container size={'xs'} p={0}>
        <AddConnectionForm
          onClose={props.onClose}
          sourceUrl={props.sourceUrl}
          connectionToEdit={props.connectionToEdit}
        />
      </Container>
    </Drawer>
  );
}
