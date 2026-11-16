import CanvasOpenGraph from '@/features/openGraph/components/openGraphCard/CanvasOpenGraph';
import { loadSharedCanvas } from '@/features/canvas/server/sharedCanvasData';

interface Props {
  params: Promise<{ token: string }>;
}

// Node runtime to match the collection OG image, which this follows.
export const runtime = 'nodejs';

export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image(props: Props) {
  const { token } = await props.params;
  try {
    const { record, author, thumbnail } = await loadSharedCanvas(token);
    return await CanvasOpenGraph({
      name: record.name,
      linkCount: record.linkCount,
      author: author
        ? {
            name: author.name,
            handle: author.handle,
            avatarUrl: author.avatarUrl,
          }
        : null,
      thumbnail,
    });
  } catch {
    // A bad or revoked token still renders a card
    return await CanvasOpenGraph({
      name: 'Canvas',
      linkCount: 0,
      author: null,
      thumbnail: null,
    });
  }
}
