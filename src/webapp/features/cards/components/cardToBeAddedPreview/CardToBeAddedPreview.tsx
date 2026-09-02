import { ReactNode } from 'react';
import {
  Group,
  Stack,
  Image,
  Text,
  Card,
  Anchor,
  Tooltip,
  Box,
} from '@mantine/core';

import { getDomain } from '@/lib/utils/link';

interface Props {
  url: string;
  imageUrl?: string;
  title?: string;
  libraryCount?: number;
  isInYourLibrary?: boolean;
  action?: ReactNode;
  children?: ReactNode;
}

function getSavedByLabel(count: number, isInYourLibrary?: boolean) {
  if (count === 0) return 'Not saved by anyone yet';

  if (isInYourLibrary) {
    if (count === 1) return 'Saved by you';
    const others = count - 1;
    return `Saved by you and ${others} other${others > 1 ? 's' : ''}`;
  }

  return count === 1 ? 'Saved by 1 person' : `Saved by ${count} people`;
}

function getSavedByShortLabel(count: number, isInYourLibrary?: boolean) {
  if (count === 0) return 'Not saved yet';

  if (isInYourLibrary) {
    return count === 1 ? 'You' : `You + ${count - 1}`;
  }

  return count === 1 ? '1 save' : `${count} saves`;
}

export default function CardToBeAddedPreview(props: Props) {
  const domain = getDomain(props.url);
  const savedBy = getSavedByLabel(
    props.libraryCount ?? 0,
    props.isInYourLibrary,
  );
  const savedByShort = getSavedByShortLabel(
    props.libraryCount ?? 0,
    props.isInYourLibrary,
  );

  return (
    <Card withBorder component="article" p={'xs'} radius={'lg'}>
      <Stack gap={'xs'}>
        <Group gap={'sm'} wrap="nowrap">
          {props.imageUrl && (
            <Card
              p={0}
              radius={'md'}
              withBorder
              w={45}
              h={45}
              style={{ flexShrink: 0 }}
            >
              <Image
                src={props.imageUrl}
                alt={`${props.url} social preview image`}
                w={'100%'}
                h={'100%'}
                fit="cover"
              />
            </Card>
          )}
          <Stack gap={0} miw={0} style={{ flex: 1 }}>
            {props.title && (
              <Text fw={500} lineClamp={1} c={'bright'}>
                {props.title}
              </Text>
            )}
            <Group gap={4} wrap="nowrap" miw={0}>
              <Tooltip label={props.url}>
                <Anchor
                  href={props.url}
                  target="_blank"
                  c={'gray'}
                  fz={'sm'}
                  lineClamp={1}
                  style={{ flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {domain}
                </Anchor>
              </Tooltip>
              <Tooltip label={savedBy}>
                <Text
                  fz={'sm'}
                  c={'dimmed'}
                  miw={0}
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  · {savedByShort}
                </Text>
              </Tooltip>
            </Group>
          </Stack>
          {props.action && <Box style={{ flexShrink: 0 }}>{props.action}</Box>}
        </Group>
        {props.children}
      </Stack>
    </Card>
  );
}
