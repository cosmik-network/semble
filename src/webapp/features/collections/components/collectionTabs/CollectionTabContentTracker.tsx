'use client';

import { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import {
  describeItemClick,
  findClickedItem,
} from '@/features/analytics/pageVisit';
import {
  collectionTabFromSegment,
  trackCollectionItemClicked,
} from '../../lib/analytics';

interface Props {
  rkey: string;
  children: React.ReactNode;
}

/**
 * Records `item_clicked` for clicks inside the active tab's content. Each tab
 * is its own route, so this wraps the layout's children rather than each tab.
 */
export default function CollectionTabContentTracker(props: Props) {
  const pathname = usePathname();
  const tab = collectionTabFromSegment(pathname.split('/')[5]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const item = findClickedItem(e.currentTarget, e.target as Element);
    if (!item) return;

    const click = describeItemClick(item);
    if (click) trackCollectionItemClicked(props.rkey, tab, click);
  };

  return <div onClickCapture={handleClick}>{props.children}</div>;
}
