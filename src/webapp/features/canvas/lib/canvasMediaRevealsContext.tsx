import { createContext, use } from 'react';
import { useValue, type TLShapeId } from 'tldraw';
import type { MediaReveals } from '../controller/mediaReveals';

// Null until the board has loaded
const CanvasMediaRevealsContext = createContext<MediaReveals | null>(null);

interface Props {
  mediaReveals: MediaReveals | null;
  children: React.ReactNode;
}

export function CanvasMediaRevealsProvider(props: Props) {
  return (
    <CanvasMediaRevealsContext value={props.mediaReveals}>
      {props.children}
    </CanvasMediaRevealsContext>
  );
}

export function useMediaReveals() {
  return use(CanvasMediaRevealsContext);
}

export function useMediaRevealed(id: TLShapeId) {
  const mediaReveals = use(CanvasMediaRevealsContext);
  return useValue(
    'media revealed',
    () => mediaReveals?.isRevealed(id) ?? false,
    [mediaReveals, id],
  );
}
