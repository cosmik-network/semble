import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SharedCanvasBoard from '@/features/canvas/components/sharedCanvasBoard/SharedCanvasBoard';
import { loadSharedCanvas } from '@/features/canvas/server/sharedCanvasData';

// 24 base64url characters, as the server mints them
const SHARE_TOKEN = /^[A-Za-z0-9_-]{24}$/;

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { token } = await props.params;
  if (!SHARE_TOKEN.test(token)) return {};
  try {
    const { record, author } = await loadSharedCanvas(token);
    return {
      title: author ? `${record.name} (by ${author.name})` : record.name,
      description: author
        ? `View ${author.name}'s canvas on Semble`
        : 'View this canvas on Semble',
      authors: author ? [{ name: author.name }] : undefined,
    };
  } catch {
    // A bad token shows the page's own not-valid message
    return {};
  }
}

// A view-only board addressed by its share token. No sign-in: the token is
// the credential, matched against the server's sharedOpen route.
export default async function Page(props: Props) {
  const { token } = await props.params;
  if (!SHARE_TOKEN.test(token)) notFound();
  return <SharedCanvasBoard shareToken={token} />;
}
