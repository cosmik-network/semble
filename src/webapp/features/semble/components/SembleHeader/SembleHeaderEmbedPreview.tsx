import { getUrlMetadata } from '@/features/cards/lib/dal';
import EmbedPreviewImage from '@/features/platforms/common/components/embedPreviewImage/EmbedPreviewImage';

interface Props {
  url: string;
}

export default async function SembleHeaderEmbedPreview(props: Props) {
  const { metadata } = await getUrlMetadata({ url: props.url });
  return <EmbedPreviewImage src={metadata.imageUrl} />;
}
