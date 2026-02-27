'use client';

import { CollectionAccessType } from '@semble/types';
import { Container, Drawer } from '@mantine/core';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import CreateCollectionForm from './CreateCollectionForm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialAccessType?: CollectionAccessType;
  onCreate?: () => void;
}

export default function CreateCollectionDrawer(props: Props) {
  return (
    <Drawer
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      size={'31rem'}
      padding={'sm'}
      position="bottom"
      overlayProps={DEFAULT_OVERLAY_PROPS}
    >
      <Drawer.Header>
        <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
          New Collection
        </Drawer.Title>
      </Drawer.Header>

      <Container size={'sm'} p={0}>
        <CreateCollectionForm
          onClose={props.onClose}
          initialName={props.initialName}
          initialAccessType={props.initialAccessType}
          onCreate={props.onCreate}
        />
      </Container>
    </Drawer>
  );
}
