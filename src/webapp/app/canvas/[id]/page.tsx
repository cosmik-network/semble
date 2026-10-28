import CanvasBoard from '@/features/canvas/components/canvasBoard/CanvasBoard';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page(props: Props) {
  const { id } = await props.params;

  return <CanvasBoard canvasId={id} />;
}
