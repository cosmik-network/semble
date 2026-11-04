import { createContext, use } from 'react';
import type { CollectionFrames } from '../controller/collectionFrames';

// Null until the board has loaded
const CanvasCollectionFramesContext = createContext<CollectionFrames | null>(
  null,
);

interface Props {
  collectionFrames: CollectionFrames | null;
  children: React.ReactNode;
}

export function CanvasCollectionFramesProvider(props: Props) {
  return (
    <CanvasCollectionFramesContext value={props.collectionFrames}>
      {props.children}
    </CanvasCollectionFramesContext>
  );
}

export function useCollectionFrames() {
  return use(CanvasCollectionFramesContext);
}
