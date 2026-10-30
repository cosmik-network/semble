'use client';

import { LinkNavLink } from '@/components/link/MantineLink';
import LibraryNavSectionSkeleton from '@/features/library/components/libraryNav/Skeleton.LibraryNavSection';
import { useNavbarContext } from '@/providers/navbar';
import { canvasHref, RECENT_CANVASES_LIMIT } from '../../lib/constants';
import useCanvases from '../../lib/queries/useCanvases';

export default function CanvasNavItems() {
  const { toggleMobile } = useNavbarContext();
  const { data: canvases, error } = useCanvases();
  if (error) throw error;
  if (!canvases) return <LibraryNavSectionSkeleton />;

  return canvases
    .slice(0, RECENT_CANVASES_LIMIT)
    .map((canvas) => (
      <LinkNavLink
        key={canvas.id}
        href={canvasHref(canvas.id)}
        label={canvas.name}
        c="gray"
        py="xxs"
        onClick={toggleMobile}
      />
    ));
}
