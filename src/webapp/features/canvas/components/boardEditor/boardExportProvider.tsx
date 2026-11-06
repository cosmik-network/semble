'use client';

import { MantineProvider } from '@mantine/core';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useSvgExportContext, useValue, type Atom } from 'tldraw';
import { SettingsProvider } from '@/providers/settings';
import { theme } from '@/styles/theme';
import type { CanvasController } from '../../controller/canvasController';
import { CanvasCollectionFramesProvider } from '../../lib/canvasCollectionFramesContext';
import { CanvasCopiesProvider } from '../../lib/canvasCopiesContext';
import { CanvasMediaRevealsProvider } from '../../lib/canvasMediaRevealsContext';
import { CanvasServerProvider } from '../../lib/canvasServerContext';
import type { CanvasServer } from '../../server/canvasServer';

export interface BoardExportContext {
  queryClient: QueryClient;
  server: CanvasServer;
  controller: CanvasController | null;
}

interface Props {
  children: React.ReactNode;
}

// The app's color scheme attribute stays where the app's provider put it
const detachedRoot = () => document.createElement('div');

// tldraw renders an export, the board's thumbnail among them, in a React root
// of its own, so the card faces need the app's providers again there.
// Takes an atom, as tldraw recreates the editor when its options change.
export function createBoardExportProvider(context: Atom<BoardExportContext>) {
  return function BoardExportProvider(props: Props) {
    const board = useValue('board export', () => context.get(), [context]);
    const isDarkMode = useSvgExportContext()?.isDarkMode ?? false;
    const controller = board.controller;

    return (
      <QueryClientProvider client={board.queryClient}>
        <MantineProvider
          theme={theme}
          forceColorScheme={isDarkMode ? 'dark' : 'light'}
          getRootElement={detachedRoot}
          withCssVariables={false}
          withGlobalClasses={false}
        >
          <SettingsProvider>
            <CanvasServerProvider server={board.server}>
              <CanvasCopiesProvider copies={controller?.copies ?? null}>
                <CanvasMediaRevealsProvider
                  mediaReveals={controller?.mediaReveals ?? null}
                >
                  <CanvasCollectionFramesProvider
                    collectionFrames={controller?.collectionFrames ?? null}
                  >
                    {props.children}
                  </CanvasCollectionFramesProvider>
                </CanvasMediaRevealsProvider>
              </CanvasCopiesProvider>
            </CanvasServerProvider>
          </SettingsProvider>
        </MantineProvider>
      </QueryClientProvider>
    );
  };
}
