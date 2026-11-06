import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { canvasHref } from '@/features/canvas/lib/constants';

interface Props {
  searchParams: Promise<{ url?: string; collection?: string }>;
}

export default async function Page(props: Props) {
  // Without this the redirect is prerendered and every board shares one id
  await connection();
  const { url, collection } = await props.searchParams;
  redirect(
    canvasHref(
      crypto.randomUUID(),
      collection ? { collectionId: collection } : url ? { url } : undefined,
    ),
  );
}
