import type { ReaderContent } from '@/app/api/reader/route';
import { cache } from 'react';

export const getReaderContent = cache(
  async (url: string): Promise<ReaderContent> => {
    const res = await fetch(`/api/reader?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Unknown error');
    return json as ReaderContent;
  },
);
