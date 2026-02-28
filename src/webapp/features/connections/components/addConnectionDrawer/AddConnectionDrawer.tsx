'use client';

import { Container, Drawer } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import AddConnectionForm from './AddConnectionForm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl: string;
}

export default function AddConnectionDrawer(props: Props) {
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
          New Connection
        </Drawer.Title>
      </Drawer.Header>
      <Container size={'sm'} p={0}>
        <AddConnectionForm
          onClose={props.onClose}
          sourceUrl={props.sourceUrl}
        />
      </Container>
    </Drawer>
  );
}
