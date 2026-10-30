import { notFound } from 'next/navigation';
import CanvasBoard from '@/features/canvas/components/canvasBoard/CanvasBoard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ id: string }>;
  // A link's Semble page starts a new board; a collection's page adds the
  // collection to any board
  searchParams: Promise<{ url?: string; collection?: string }>;
}

export default async function Page(props: Props) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const { url, collection } = await props.searchParams;

  return (
    <CanvasBoard canvasId={id} seedUrl={url} seedCollectionId={collection} />
  );
}
