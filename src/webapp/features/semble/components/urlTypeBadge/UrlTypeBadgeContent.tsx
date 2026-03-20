import { getUrlMetadata } from '@/features/cards/lib/dal';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { Badge } from '@mantine/core';
import { UrlType } from '@semble/types';
import { IconType } from 'react-icons/lib';

interface Props {
  url: string;
}

export default async function UrlTypeBadgeContent({ url }: Props) {
  const { metadata } = await getUrlMetadata({ url });
  const urlTypeIcon = getUrlTypeIcon(metadata.type as UrlType);
  const IconComponent = urlTypeIcon as IconType;

  return (
    <Badge size="xs" color="lime" leftSection={<IconComponent />}>
      {metadata.type}
    </Badge>
  );
}
