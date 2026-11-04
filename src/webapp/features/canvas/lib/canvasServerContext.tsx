import { createContext, use } from 'react';
import type { CanvasServer } from '../server/canvasServer';

const CanvasServerContext = createContext<CanvasServer | null>(null);

interface Props {
  server: CanvasServer;
  children: React.ReactNode;
}

export function CanvasServerProvider(props: Props) {
  return (
    <CanvasServerContext value={props.server}>
      {props.children}
    </CanvasServerContext>
  );
}

export function useCanvasServer() {
  const ctx = use(CanvasServerContext);
  if (!ctx) {
    throw new Error('useCanvasServer must be used inside CanvasServerProvider');
  }
  return ctx;
}
