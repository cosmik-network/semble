'use client';

import { ReactNode } from 'react';
import { ScrollArea } from '@mantine/core';
import { useScrollFade } from '@/hooks/useScrollFade';

// Total height of a selector tab panel (search input + collection list).
// Fixed so the modal keeps the same height across loading, loaded, and
// few-collections states; the scroll area flexes to fill whatever the
// search row doesn't use. Capped to a fraction of the viewport so the
// modal doesn't overflow short screens (e.g. iPhone SE).
export const COLLECTION_PANEL_HEIGHT = 'min(284px, 32dvh)';

interface Props {
  children: ReactNode;
}

// Scroll container for the selector tabs' collection lists. Fills the
// remaining panel height and fades the top/bottom edge when there is more
// content to scroll to.
export default function CollectionListScrollArea(props: Props) {
  const { setViewport, maskImage, updateFade } = useScrollFade();

  return (
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
      {props.children}
    </ScrollArea>
  );
}
