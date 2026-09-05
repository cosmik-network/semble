'use client';

import { Drawer, ScrollArea, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import { useScrollFade } from '@/hooks/useScrollFade';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  skeleton: ReactNode;
  errorMessage: string;
  children: ReactNode;
}

export default function StatDrawer(props: Props) {
  const isDesktop = useMediaQuery('(min-width: 48em)', false);
  const { setViewport, maskImage, updateFade } = useScrollFade();

  return (
    <Drawer
      opened={props.isOpen}
      onClose={props.onClose}
      position={isDesktop ? 'right' : 'bottom'}
      size={isDesktop ? 'md' : '80%'}
      title={<Text fw={600}>{props.title}</Text>}
      overlayProps={DEFAULT_OVERLAY_PROPS}
      onClick={(e) => e.stopPropagation()}
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <ScrollArea
        type="auto"
        style={{ flex: 1, minHeight: 0 }}
        viewportRef={setViewport}
        onScrollPositionChange={updateFade}
        styles={{
          viewport: maskImage
            ? { maskImage, WebkitMaskImage: maskImage }
            : undefined,
        }}
      >
        <ErrorBoundary fallback={<ErrorState message={props.errorMessage} />}>
          <Suspense fallback={props.skeleton}>{props.children}</Suspense>
        </ErrorBoundary>
      </ScrollArea>
    </Drawer>
  );
}
