'use client';

import { AspectRatio, Card, Image, Stack, Text } from '@mantine/core';
import { Fragment, useState } from 'react';
import { getDomain } from '@/lib/utils/link';

export const THUMBNAIL_CARD_WIDTH = 110;

interface Props {
  imageUrl?: string;
  title?: string;
  url: string;
  // Whole Card replacement for the image, e.g. an icon or a placeholder
  // graphic — shown when there's no imageUrl or it fails to load.
  fallback: React.ReactNode;
  textHeight?: number;
}

export default function ThumbnailPreviewCard(props: Props) {
  const [imageError, setImageError] = useState(false);
  const hasImage = props.imageUrl && !imageError;

  return (
    <Fragment>
      <AspectRatio ratio={16 / 9}>
        {hasImage ? (
          <Card p={0} radius="md" withBorder>
            <Image
              src={props.imageUrl}
              alt={`${props.title || props.url} thumbnail`}
              w="100%"
              h="100%"
              fit="cover"
              draggable={false}
              onError={() => setImageError(true)}
            />
          </Card>
        ) : (
          props.fallback
        )}
      </AspectRatio>
      <Stack gap={0} mt={6} mih={props.textHeight}>
        <Text c="gray" fz={11} lineClamp={1}>
          {getDomain(props.url)}
        </Text>
        {props.title && (
          <Text c="bright" fz={12} fw={500} lineClamp={2}>
            {props.title}
          </Text>
        )}
      </Stack>
    </Fragment>
  );
}
