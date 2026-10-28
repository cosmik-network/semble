import { notFound } from 'next/navigation';
import CanvasBoard from '@/features/canvas/components/canvasBoard/CanvasBoard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page(props: Props) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  return <CanvasBoard canvasId={id} />;
}
