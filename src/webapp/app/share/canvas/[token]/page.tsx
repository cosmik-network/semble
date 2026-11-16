import { notFound } from 'next/navigation';
import SharedCanvasBoard from '@/features/canvas/components/sharedCanvasBoard/SharedCanvasBoard';

// 24 base64url characters, as the server mints them
const SHARE_TOKEN = /^[A-Za-z0-9_-]{24}$/;

interface Props {
  params: Promise<{ token: string }>;
}

// A view-only board addressed by its share token. No sign-in: the token is
// the credential, matched against the server's sharedOpen route.
export default async function Page(props: Props) {
  const { token } = await props.params;
  if (!SHARE_TOKEN.test(token)) notFound();
  return <SharedCanvasBoard shareToken={token} />;
}
