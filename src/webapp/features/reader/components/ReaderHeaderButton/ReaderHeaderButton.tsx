'use client';

import { useSearchParams } from 'next/navigation';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import ReaderButton from '../ReaderButton/ReaderButton';

export default function ReaderHeaderButton() {
  const { data: featureFlags } = useFeatureFlags();
  const searchParams = useSearchParams();
  const rawId = searchParams.get('id');

  if (!featureFlags?.readerMode || !rawId) return null;

  const url = decodeURIComponent(rawId);

  // Key is used to reset reader state across /url navigations
  return <ReaderButton key={url} url={url} />;
}
