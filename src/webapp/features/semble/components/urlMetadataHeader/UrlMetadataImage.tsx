import { getUrlMetadata } from '@/features/cards/lib/dal';
import { Image } from '@mantine/core';
import { LinkCard } from '@/components/link/MantineLink';

interface Props {
  url: string;
}

export default async function UrlMetadataImage(props: Props) {
  const { metadata } = await getUrlMetadata({ url: props.url });

  if (!metadata.imageUrl) return null;

  return (
    <LinkCard p={0} radius={'md'} href={props.url} target="_blank" withBorder>
      <Image
        src={metadata.imageUrl}
        alt={`${props.url} social preview image`}
        mah={150}
        w={'auto'}
        maw={280}
        fit="contain"
      />
    </LinkCard>
  );
}
