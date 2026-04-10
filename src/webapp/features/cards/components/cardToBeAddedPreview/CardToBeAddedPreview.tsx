import {
  Group,
  Stack,
  Image,
  Text,
  Card,
  Anchor,
  Tooltip,
} from '@mantine/core';

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
        <Group gap={'sm'} wrap="nowrap">
          {props.imageUrl && (
            <Image
              src={props.imageUrl}
              alt={`${props.url} social preview image`}
              radius={'md'}
              w={45}
              h={45}
            />
          )}
          <Stack gap={0}>
            {props.title && (
              <Text fw={500} lineClamp={1} c={'bright'}>
                {props.title}
              </Text>
            )}
            <Tooltip label={props.url}>
              <Anchor
                href={props.url}
                target="_blank"
                c={'gray'}
                fz={'sm'}
                lineClamp={1}
                onClick={(e) => e.stopPropagation()}
              >
                {domain}
              </Anchor>
            </Tooltip>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
