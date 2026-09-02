'use client';

import { Drawer, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  skeleton: ReactNode;
  errorMessage: string;
  children: ReactNode;
}

export default function CollectionStatDrawer(props: Props) {
  const isDesktop = useMediaQuery('(min-width: 48em)', false);

  return (
    <Drawer
      opened={props.isOpen}
      onClose={props.onClose}
      position={isDesktop ? 'right' : 'bottom'}
      size={isDesktop ? 'md' : '80%'}
      title={<Text fw={600}>{props.title}</Text>}
      overlayProps={DEFAULT_OVERLAY_PROPS}
      onClick={(e) => e.stopPropagation()}
    >
      <ErrorBoundary fallback={<ErrorState message={props.errorMessage} />}>
        <Suspense fallback={props.skeleton}>{props.children}</Suspense>
      </ErrorBoundary>
    </Drawer>
  );
}
