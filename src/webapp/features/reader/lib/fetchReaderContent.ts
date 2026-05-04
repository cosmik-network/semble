import type { ReaderContent } from '@/app/api/reader/route';

export type ReaderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ReaderContent };

export async function fetchReaderContent(
  url: string,
  setState: (state: ReaderState) => void,
): Promise<void> {
  setState({ status: 'loading' });
  try {
    const res = await fetch(`/api/reader?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (!res.ok) {
      setState({ status: 'error', message: json.error ?? 'Unknown error' });
      return;
    }
    setState({ status: 'success', data: json as ReaderContent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load reader content';
    setState({ status: 'error', message });
  }
}
