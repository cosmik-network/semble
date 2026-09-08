'use client';

import { useSearchParams } from 'next/navigation';
import ReaderButton from '../ReaderButton/ReaderButton';

export default function ReaderHeaderButton() {
  const searchParams = useSearchParams();
  const url = searchParams.get('id');

  if (!url) return null;

  // Key is used to reset reader state across /url navigations
  return <ReaderButton key={url} url={url} />;
}
