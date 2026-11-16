'use client';

import dynamic from 'next/dynamic';
import SharedCanvasBoardSkeleton from './Skeleton.SharedCanvasBoard';

// Loaded on demand so tldraw stays out of every other page's bundle. tldraw
// touches window on import, so it never renders on the server.
const SharedBoardEditor = dynamic(() => import('./SharedBoardEditor'), {
  ssr: false,
  loading: () => <SharedCanvasBoardSkeleton />,
});

// A board opened through a share link: read-only, no storage, no session
export default function SharedCanvasBoard(props: { shareToken: string }) {
  return (
    <SharedBoardEditor key={props.shareToken} shareToken={props.shareToken} />
  );
}
