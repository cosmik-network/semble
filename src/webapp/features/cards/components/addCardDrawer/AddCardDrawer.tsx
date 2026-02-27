'use client';

import { Container, Drawer } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import AddCardForm from './AddCardForm';
import { Collection } from '@semble/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCollection?: Collection;
  initialUrl?: string;
}

export default function AddCardDrawer(props: Props) {
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
          New Card
        </Drawer.Title>
      </Drawer.Header>
      <Container size={'sm'} p={0}>
        <AddCardForm
          onClose={props.onClose}
          selectedCollection={props.selectedCollection}
          initialUrl={props.initialUrl}
        />
      </Container>
    </Drawer>
  );
}
