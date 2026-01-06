import {
  AspectRatio,
  Group,
  Stack,
  Image,
  Text,
  Card,
  Anchor,
  Tooltip,
} from '@mantine/core';
import Link from 'next/link';
import { Dispatch, SetStateAction, useState } from 'react';
import { getDomain } from '@/lib/utils/link';

interface Props {
  url: string;
  imageUrl?: string;
  title?: string;
}

export default function CardToBeAddedPreview(props: Props) {
  const domain = getDomain(props.url);

  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Stack>
        <Group gap={'sm'} justify="space-between">
          {props.imageUrl && (
            <AspectRatio ratio={1 / 1} flex={0.1}>
              <Image
                src={props.imageUrl}
                alt={`${props.url} social preview image`}
                radius={'md'}
                w={45}
                h={45}
              />
            </AspectRatio>
          )}
          <Stack gap={0} flex={0.9}>
            <Tooltip label={props.url}>
              <Anchor
                component={Link}
                href={props.url}
                target="_blank"
                c={'gray'}
                lineClamp={1}
                onClick={(e) => e.stopPropagation()}
              >
                {domain}
              </Anchor>
            </Tooltip>
            {props.title && (
              <Text fw={500} lineClamp={1} c={'bright'}>
                {props.title}
              </Text>
            )}
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
