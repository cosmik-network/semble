import { notFound, redirect } from 'next/navigation';
import CanvasBoard from '@/features/canvas/components/canvasBoard/CanvasBoard';
import { STRESS_CANVAS_ID } from '@/features/canvas/lib/constants';

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
  // Its links exist only on the stress board's in-memory server
  if (id === STRESS_CANVAS_ID) redirect('/canvas/stress');
  const { url, collection } = await props.searchParams;

  return (
    <CanvasBoard canvasId={id} seedUrl={url} seedCollectionId={collection} />
  );
}
