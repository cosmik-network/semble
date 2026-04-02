import { getUrlMetadata } from '@/features/cards/lib/dal';
import { Image, Card } from '@mantine/core';
import Link from 'next/link';

interface Props {
  url: string;
}

export default async function UrlMetadataImage(props: Props) {
  const { metadata } = await getUrlMetadata({ url: props.url });

  if (!metadata.imageUrl) return null;

  return (
    <Card
      p={0}
      radius={'md'}
      component={Link}
      href={props.url}
      target="_blank"
      withBorder
    >
      <Image
        src={metadata.imageUrl}
        alt={`${props.url} social preview image`}
        mah={150}
        w={'auto'}
        maw={280}
        fit="contain"
      />
    </Card>
  );
}
