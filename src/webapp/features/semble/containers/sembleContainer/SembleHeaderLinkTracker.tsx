'use client';

import { MouseEvent } from 'react';
import { trackSembleAction } from '../../lib/analytics';

interface Props {
  url: string;
  children: React.ReactNode;
}

/**
 * Records `open_link` for clicks on external links in the header (title,
 * preview image, embedded post). The header is server rendered, so this
 * listens from the outside rather than on each link.
 */
export default function SembleHeaderLinkTracker(props: Props) {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (!e.currentTarget.contains(target)) return;

    const href = target.closest('a[href]')?.getAttribute('href');
    if (!href) return;

    if (new URL(href, window.location.href).origin !== window.location.origin) {
      trackSembleAction(props.url, 'open_link');
    }
  };

  return <div onClickCapture={handleClick}>{props.children}</div>;
}
