'use client';

import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { getDomain } from '@/lib/utils/link';
import { AppBskyEmbedExternal } from '@atproto/api';
import {
  AspectRatio,
  Card,
  CardSection,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';

interface Props {
  embed: AppBskyEmbedExternal.View;
}

export default function ExternalEmbed(props: Props) {
  const { settings } = useUserSettings();

  if (settings.cardView === 'grid') {
    return (
      <Card p={'xs'} withBorder>
        <Group gap={'xs'} wrap="nowrap">
          {props.embed.external.thumb && (
            <AspectRatio ratio={1 / 1}>
              <Image
                src={props.embed.external.thumb}
                alt={props.embed.external.description}
                h={50}
                w={50}
                radius={'sm'}
              />
            </AspectRatio>
          )}

          <Stack gap={0}>
            <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
              {props.embed.external.title}
            </Text>
            <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1}>
              {getDomain(props.embed.external.uri)}
            </Text>
          </Stack>
        </Group>
      </Card>
    );
  }
  return (
    <Card
      p={0}
      component="a"
      href={props.embed.external.uri}
      target="_blank"
      withBorder
    >
      <CardSection>
        {props.embed.external.thumb && (
          <AspectRatio ratio={16 / 9}>
            <Image
              src={props.embed.external.thumb}
              alt={props.embed.external.description}
            />
          </AspectRatio>
        )}
      </CardSection>

      <Stack gap={0} p={'xs'}>
        <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
          {props.embed.external.title}
        </Text>
        <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1}>
          {getDomain(props.embed.external.uri)}
        </Text>
      </Stack>
    </Card>
  );
}
