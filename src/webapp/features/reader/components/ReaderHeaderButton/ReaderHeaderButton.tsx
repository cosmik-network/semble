'use client';

import { useSearchParams } from 'next/navigation';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import ReaderButton from '../ReaderButton/ReaderButton';

export default function ReaderHeaderButton() {
  const { data: featureFlags } = useFeatureFlags();
  const searchParams = useSearchParams();
  const url = searchParams.get('id');

  if (!featureFlags?.readerMode || !url) return null;

  // Key is used to reset reader state across /url navigations
  return <ReaderButton key={url} url={url} />;
}
