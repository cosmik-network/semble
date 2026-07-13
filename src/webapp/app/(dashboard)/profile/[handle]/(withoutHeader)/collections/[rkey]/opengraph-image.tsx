import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import CollectionOpenGraph from '@/features/openGraph/components/openGraphCard/CollectionOpenGraph';
import { buildCollageTiles } from '@/features/openGraph/lib/utils/collage';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
}

// Node runtime is required: buildCollageTiles uses Buffer to base64-encode the
// pre-fetched tile images. Do not switch to 'edge'.
export const runtime = 'nodejs';

export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image(props: Props) {
  const { rkey, handle } = await props.params;

  const collection = await getCollectionPageByAtUri({
    recordKey: rkey,
    handle: handle,
  });

  const tiles = await buildCollageTiles(collection.urlCards ?? []);

  return await CollectionOpenGraph({ collection, tiles });
}
